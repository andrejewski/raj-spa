const tag = require('tagmeme')
const effects = require('raj/effect')

const Result = (function () {
  const Err = tag()
  const Ok = tag()
  const Result = tag.union([Err, Ok])
  Result.Err = Err
  Result.Ok = Ok
  return Result
})()

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
  const GetRoute = tag()
  const GetCancel = tag()
  const GetProgram = tag()
  const ProgramMsg = tag()
  const Msg = tag.union([
    GetRoute,
    GetCancel,
    GetProgram,
    ProgramMsg
  ])

  const init = (() => {
    const [
      initialProgramModel,
      initialProgramEffect
    ] = initialProgram.init
    const model = {
      routerCancel: null,
      isTransitioning: false,
      currentProgram: initialProgram,
      programModel: initialProgramModel
    }
    const effect = effects.batch([
      router.subscribe(GetRoute, GetCancel),
      effects.map(ProgramMsg, initialProgramEffect)
    ])
    return [model, effect]
  })()

  function transitionToProgram (model, program, props) {
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
    const newEffect = effects.batch([
      subDone,
      effects.map(ProgramMsg, newProgramEffect)
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
      GetCancel, routerCancel => [{...model, routerCancel}],
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
        const newEffect = effects.map(ProgramMsg, newProgramEffect)
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
    if (done) {
      subDone = subDone(model.page)
    }

    return effects.batch([
      model.routerCancel,
      subDone
    ])
  }

  return {init, update, view, done}
}

module.exports = spa
