---

$config:
  ext: .ts
  type: Index
  casing: title
  paths:
    - './app.tsx|self'
    - './shared/store.ts|self'
  injects:
    - filename: './app.tsx'
      find: '// INJECTED'
      strategy: 'after'
      insert: "import * as {{$component.group}} from '{{{$component.paths.0}}}';"
    - filename: './shared/store.ts'
      find: '// INJECTED'
      strategy: 'after'
      insert: "import * as {{$component.group}} from '{{{$component.paths.1}}}';"
    - filename: './shared/store.ts'
      find: '// REDUCERS'
      strategy: 'after'
      insert: "{{$component.group}}: {{$component.group}}.reducers,"


---

export * from './service';
export * from './component';


