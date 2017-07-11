---

$config:
  ext: .tsx
  type: Component
  rename: component
  casing: title
  paths:
    - 'self|./shared'
  injects:
    - filename: 'self'
      find: '// INJECTED'
      strategy: 'after'
      insert: "import { IAppState, IProps, store, utils, styles } from '{{{$component.paths.0}}}';"


options:
  - key: props
    type: any
    sep: ', '
  - key: context
    type: any

super: true

props:

---

import * as React from 'react';
import { render } from 'react-dom';
import { Store } from 'redux';

{{#imports}}
import {{module}} from '{{{from}}}';
{{/imports}}

// INJECTED

class {{$component.fullname}} extends React.Component<IProps<any>, any>  {

  {{#props}}
  {{key}}: {{type}};
  {{/props}}

  {{#constructor}}
  constructor({{#options}}{{key}}: {{type}}{{sep}}{{/options}}) {
    {{#super}}
    super({{#options}}{{key}}{{sep}}{{/options}})
    {{/super}}
  }
  {{/constructor}}

  /* LIFECYCLE EVENTS
  *****************************************************************/

  // componentWillMount?() { }

  // componentDidMount?() { }

  // componentWillUpdate?(nextProps, nextState, nextContext) { }

  // componentDidUpdate?(prevProps, prevState, prevContext) { }

  // componentWillUnmount?() { }

  /* METHODS
  *****************************************************************/

  {{#methods}}
  {{method}}({{#args}}{{key}}: {{type}}{{sep}}{{/args}}): {{type}} {

    {{#return}}
    return {{{.}}};
    {{/return}}

  }
  {{/methods}}

  /* RENDERING
  *******************************************************************/

  render(): JSX.Element {
    return (<div>{{$component.name}} works!</div>);
  }

}

export { {{$component.fullname}} as Component }
