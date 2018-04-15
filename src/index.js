const {union} = require('tagmeme')
const {mapEffect, batchEffects} = require('raj-compose')
const {
  Result,
  selfManaged,
  isSelfManaged,
  createEmitter
} = require('./utils')

function loadProgram (program) {
  return function (dispatch) {
    const isPromise = !!(program.then && program.catch)
    if (!isPromise) {
      return dispatch(Result.Ok(program))
    }
    return program
      .then(program => dispatch(Result.Ok(program)))
      .catch(error => dispatch(Result.Err(error)))
  }
}

function spa ({
  // required
  router,
  getRouteProgram,
  initialProgram,

  // optional
  errorProgram,
  containerView
}) {
  const Msg = union([
    'GetRoute',
    'GetProgram',
    'ProgramMsg'
  ])

  const init = (() => {
    const [
      initialProgramModel,
      initialProgramEffect
    ] = initialProgram.init
    const {
      effect: routerEffect,
      cancel: routerCancel
    } = router.subscribe()
    const model = {
      routerCancel,
      routeEmitter: null,
      isTransitioning: false,
      currentProgram: initialProgram,
      programKey: null,
      programModel: initialProgramModel
    }
    const effect = batchEffects([
      mapEffect(routerEffect, Msg.GetRoute),
      mapEffect(initialProgramEffect, Msg.ProgramMsg)
    ])
    return [model, effect]
  })()

  function transitionToProgram (model, program) {
    const [
      newProgramModel,
      newProgramEffect
    ] = program.init
    const newModel = {
      ...model,
      currentProgram: program,
      programModel: newProgramModel
    }
    const subDone = model.currentProgram.done
    const newEffect = batchEffects([
      subDone
        ? () => subDone(model.programModel)
        : undefined,
      mapEffect(newProgramEffect, Msg.ProgramMsg)
    ])
    return [newModel, newEffect]
  }

  function update (msg, model) {
    return Msg.match(msg, {
      GetRoute: route => {
        let programKey = null
        let routeEmitter = null
        let newProgram = getRouteProgram(route, { selfManaged })
        if (isSelfManaged(newProgram)) {
          const { key, makeProgram } = newProgram
          const isContinuation = model.programKey && model.programKey === key
          if (isContinuation) {
            return [model, () => model.routeEmitter.emit(route)]
          }

          programKey = key
          routeEmitter = createEmitter()
          newProgram = makeProgram(routeEmitter.subscribe)
        }

        return [
          {
            ...model,
            programKey,
            routeEmitter,
            isTransitioning: true
          },
          mapEffect(loadProgram(newProgram), Msg.GetProgram)
        ]
      },
      GetProgram: program => {
        const newModel = {...model, isTransitioning: false}
        return Result.match(program, {
          Ok: program => transitionToProgram(newModel, program),
          Err: error => {
            if (errorProgram) {
              const program = errorProgram(error)
              return transitionToProgram(newModel, program)
            }
            console.error(error)
            return [model]
          }
        })
      },
      ProgramMsg: msg => {
        const [
          newProgramModel,
          newProgramEffect
        ] = model.currentProgram.update(msg, model.programModel)
        const newModel = {...model, programModel: newProgramModel}
        const newEffect = mapEffect(newProgramEffect, Msg.ProgramMsg)
        return [newModel, newEffect]
      }
    })
  }

  function view (model, dispatch) {
    const subView = model.currentProgram.view(
      model.programModel,
      x => dispatch(Msg.ProgramMsg(x))
    )

    if (containerView) {
      const viewFrameModel = {isTransitioning: model.isTransitioning}
      return containerView(viewFrameModel, subView)
    }

    return subView
  }

  function done (model) {
    let subDone = model.currentProgram.done
    if (subDone) {
      subDone(model.programModel)
    }

    if (model.routerCancel) {
      model.routerCancel()
    }
  }

  return {init, update, view, done}
}

module.exports = spa
