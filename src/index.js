const tag = require('tagmeme')
const {mapEffect, batchEffects} = require('raj-compose')

const Result = tag.namedUnion(['Ok', 'Err'])

function loadProgram (program, programMsg) {
  return function (dispatch) {
    const isPromise = !!(program.then && program.catch)
    if (!isPromise) {
      return dispatch(programMsg(Result.Ok(program)))
    }
    return program
      .then(program => dispatch(programMsg(Result.Ok(program))))
      .catch(error => dispatch(programMsg(Result.Err(error))))
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
  const Msg = tag.namedUnion([
    'GetRoute',
    'GetProgram',
    'ProgramMsg'
  ])
  const {
    GetRoute,
    GetProgram,
    ProgramMsg
  } = Msg

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
      isTransitioning: false,
      currentProgram: initialProgram,
      programModel: initialProgramModel
    }
    const effect = batchEffects([
      mapEffect(routerEffect, GetRoute),
      mapEffect(initialProgramEffect, ProgramMsg)
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
    let subDone = model.currentProgram.done
    if (subDone) {
      subDone = subDone(model.programModel)
    }
    if (subDone) {
      // Do not expose dispatch to subDone
      const _subDone = subDone
      subDone = () => _subDone()
    }
    const newEffect = batchEffects([
      subDone,
      mapEffect(newProgramEffect, ProgramMsg)
    ])
    return [newModel, newEffect]
  }

  function update (msg, model) {
    return Msg.match(msg, [
      GetRoute, route => {
        const newProgram = getRouteProgram(route)
        const newModel = {...model, isTransitioning: true}
        return [newModel, loadProgram(newProgram, GetProgram)]
      },
      GetProgram, program => {
        const newModel = {...model, isTransitioning: false}
        return Result.match(program, [
          Result.Ok, program => transitionToProgram(newModel, program),
          Result.Err, error => {
            if (errorProgram) {
              const program = errorProgram(error)
              return transitionToProgram(newModel, program)
            }
            console.error(error)
            return [model]
          }
        ])
      },
      ProgramMsg, msg => {
        const [
          newProgramModel,
          newProgramEffect
        ] = model.currentProgram.update(msg, model.programModel)
        const newModel = {...model, programModel: newProgramModel}
        const newEffect = mapEffect(newProgramEffect, ProgramMsg)
        return [newModel, newEffect]
      }
    ])
  }

  function view (model, dispatch) {
    const subView = model.currentProgram.view(
      model.programModel,
      x => dispatch(ProgramMsg(x))
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
