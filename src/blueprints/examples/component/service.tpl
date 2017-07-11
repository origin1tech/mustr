---

$config:
  ext: .ts
  type: Service
  casing: title
  paths:
    - 'self|./shared'
  injects:
    - filename: 'self'
      find: '// INJECTED'
      strategy: 'after'
      insert: "import {  IAction, IState, IApp, utils } from '{{{$component.paths.0}}}';"

---

// INJECTED

const COMPONENT_NAME = '{{$component.fullname}}';
const actions: any = {};
const reducers: any = {};

/* ACTIONS
***********************************************/

enum ActionType {
  GET_NAME
}

actions.name = utils.createAction(ActionType.GET_NAME);

/* REDUCERS
***********************************************/

const init: IState<IApp> = {};

reducers.main = (state: IState<IApp> = init, action: IAction) => {

  switch (action.type) {
    case ActionType.GET_NAME:
      console.log(`Hello ${COMPONENT_NAME}.`);
  }

  return state;

};

/* EXPORTS
***********************************************/

export {
  actions,
  reducers
}

