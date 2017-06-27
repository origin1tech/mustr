---

config:
  ext: .ts
  casing: capitalize
  injects:
    - filename: 'examples/db.tsx'
      find: '// INJECT'
      strategy: 'after'
      insert: "import * as _ from 'lodash';"

author: Unicorn Industries
email: unicorns@unicornindustries.com
copyright: Copyright 2017 Unicorn Industries
license: MIT

---
{{>example.author}}

{{#imports}}
import {{module}} from '{{from}}';
{{/imports}}

// INJECT

export class {{$component.fullname}} {

  {{#props}}
  {{key}}: {{type}};
  {{/props}}

  {{#constructor}}
  constructor({{#options}}{{key}}: {{type}}{{/options}}) {

  }
  {{/constructor}}

  {{#methods}}
  {{method}}({{#args}}{{key}}: {{type}}{{/args}}): {{type}} {

    {{#return}}
    return {{.}};
    {{/return}}

  }
  {{/methods}}

}