<p align="center">
  <a href="http://github.com/origin1tech/mustr"><img width="150" src="https://raw.githubusercontent.com/origin1tech/mustr/master/assets/logo.png"></a>
</p>
<br/>

## Description

Minimalistic scaffolding tool using Mustache Templates with handy rollback feature.

Scaffolding can be a time saver and helps in consistency for teams. Yeoman is perhaps the most popular tool for this requirement. However building out your own generators can be cumbersome and time consuming. In the end the need is often no more than passing in some params then rendering those params in your template. Mustr attempts to fill that need in a simplistic and declarative way without the hassle and time investment. Once you buy in you'll find it rather trivial to flesh out templates.

## Installing & Initialization

```sh
$ npm install mustr -g
```

Initialize your project for use with Mustr. This will create a mustr.json configuration file along with a folder called Mustr. This folder is where you'll store your .tpl or template files as well as a file called "register.js".

Register.js is where you'll register your templates. You can register the same template multiple times with unique names keeping your templates DRY (don't repeat yourself). This is done by registering your template with a callback which allows you to do further manipulation before the template is rendered. We'll get to more on that in a min.

Open a terminal at the root of your project and then run:

```sh
$ mu init
```

## Options

The options are pretty minial and mot much to configure. There are basically three properties in your "mustr.json" file. It is not likely that you'll need to change these for most projects but in case you do...

- configDir the configuration directory from root usually "./mustr".
- outputDir the output or where your source files are usually "./src".
- templateExt the extension used for your templates usually ".tpl".
- autoLoad when true auto loads templates/config, only need to set to false if loading Mustr manually.
- autoRegister auto registers found templates, manually register to override.
- maxRollbacks the maximum number of rollbacks to store before pruning.

The following properties are valid only when passing a config
object into Mustr manually when initializing instance. These
options cannot be set in your mustr.json file however you can
set the engine and renderer in your register.js file by calling:

- Engine the custom compiling engine to use instead of Mustache.
- renderer the rendering function to render out the template.

```js
mu.setEngine(Compiler, renderer);
```
see below for an example using Jade.

```json
{
  "configDir": "./mustr",
  "outputDir": "./src",
  "templateExt": ".tpl",
  "autoLoad": true,
  "autoRegister": true,
  "maxRollbacks" 15
}
```

## Defining Templates

Templates are defined using the Mustache templating that you likely already know and yaml front-matter similar to Jekyll or Hugo if you've used either before. The front matter allows for defining a configuration for the template but can be used as you'd expect as the metadata for your template also. At first this may seem a bit redundant however it is needed for the config and also allows for defaults for your template. You'll be able to further modify the metadata for the template as you'll see in a min below.

see: https://www.npmjs.com/package/front-matter

see: https://github.com/janl/mustache.js/

**Example Template**

There are four simple fields that are required in your front matter config.

 + ext - the extension name the file should be saved as (can be overriden)
 + type - the suffix name if any that should be applied to the name.
 + appendType - appends the component name above to the filename about.service.ts
 + casing - the casing strategy for naming the template when rendered. (ex: title for class names)
 + filenameCasing - same as above but will set the casing for the filename itself.
 + outputDir - changes the relative base path for generated templates instead of you global config.
 + outputPath - a static output path to be used rather than relative to config.
 + rename - useful when generating components, will rename the generated template to this name.
 + injects - definitions that should be inserted in other files upon rendering.

All other properties as seen below are custom. Again see above on front matter and yaml
in general for how to create objects, arrays and so on.

```hbs
---

config:
  ext: .ts
  type: Service
  casing: title
  injects:
    - filename: 'examples/db.example.tsx'
      find: '// INJECT'
      strategy: 'after'
      insert: "import * as _ from 'lodash';"
      relative: false

props:
  - key: name
    type: string
  - key: age
    type: number

---

export class {{$component.fullname}} {

  {{#props}}
  {{key}}: {{type}};
  {{/props}}

  constructor() {

  }

}
```

**$component**

The $component property is a an injected object into your metadata object used for rendering.
It's purpose is to output the following properties for use in generating files and injected
paths.

- name the name of the file/component without it's 'type' suffix.
- fullname the above name with the type suffix appened if exists.
- group the group name if any the generated template belongs to basically the component name.
- path the output path of the file being generated.
- from the relative path to the generated file from the file you injected to.
- ext the file extention type.

**The above will result in:**

```js
export class DbService {

  name: string;
  age: number;

  constructor() {

  }

}
```

## Registering Templates

You may notice we did not specify a "component" property in your front matter. You certainly could do that but obviously that kind of defeats the purpose when the desire is to generate a template. This is resolved by injecting the desired component output name you defined in your cli command. We'll get to that here in a minute.

For example consider a template named "base.service.tpl". It might reside in a folder called "services". Mustr ignores folder structures and focuses on the file name itself. Just makes it easier when looking up templates for registration. For this reason it is important to make all your file names regardless of structure uniquely named although this is not required.

**Example Register.js**

```js

module.exports = function (mu, Engine) {

  // mu is the Mustr instance.
  // Engine is the template compiling engine. (currently Mustache).

  // NAME - the name you wish to register the template under.
  // TEMPLATE - the name, path or static string template to use for the registration.
  // PARTIALS - string, array of strings, object of key value or multi arg of strings.
  // BEFORE_RENDER - callback passing TEMPLATE and done callback.
  // AFTER_RENDER - callback passing TEMPLATE.

  // Usage:
  mu.register(NAME, TEMPLATE)
    .partials('stirng', 'string')
    .beforeRender((template, done) => {  done(); })
    .afterRender((template) => {  /* do something */ });

  /* Simple Register
  *******************************************/

  // Define name and associated template.
  // The first argument is the name you wish to register
  // this name will be used when calling:
  // mu generate <template> where <template> is
  // the registered name.

  // The second arg is the path to the template to
  // associate to your name or the name of a known
  // template (.tpl files are loaded automatically).
  // Known templates can be referenced by file name
  // without extension. Additionally a static template
  // string can be passed directly for inline
  // registrations.

  mu.register('DB', 'service');

  /* Component Register
  *******************************************/

  // Registering a component allows generating multiple files
  // using a single command. It's important to know that
  // the component templates must be already registered by
  // calling mu.register();

  mu.registerComponent('group', 'template1', 'template2');

  /* Partials Register
  *******************************************/

  // Mustr supports partials as well. You could handle
  // partials manually in the callback (see advanced below)
  // however in most cases it's easiest to just pass
  // the logicless partials in your reigster command.
  // They will then be automatically rendered using your
  // front matter and/or flags passed in cli.

  mu.register('Db', 'service').partials('author');

  // OR

  mu.register('Db', 'service').partials(['author', 'footer'])

  // OR

  mu.register('Db', 'service').partials('header', 'author', 'footer');

  /* Advanced Register
  *******************************************/

  // When registring with a callback the template can
  // be manipulated before rendering.
  // For even greater control of each step see
  // tests folder to see how you can build
  // each step and render manually.

  mu.register('Db', 'service')
    .beforeRender((template, done) => {

      // do something with template
      // then call done to auto render.
      done();

    })
    .afterRender((template) => {

      // The file is rendered and written out.
      // Below is an example of manually calling
      // the .inject() method to inject for example
      // an import for the filed created.

      // NOTE: it is probably easier to inline your
      // injects in your template. see below for more on that.

      mu.inject('path/to/file', 'search expression', 'strategy', 'what to inject', () => {
        done();
      });

    });

    /* Changing Template Engine
    *******************************************/

    // Don't like Mustache? You can use whatever
    // templating engine you wish. Mustr merely
    // handles some fancy things for paths and
    // front matter/metadata. You can use whatever
    // rendering engine you wish.

    const Jade = require('jade');
    const renderer = (body, meta, /* optional object of partials here */) => {
    const template = jade.compile(body, /* jade options */);
        return template(meta);
    }
    mu.setEngine(Jade, renderer);

};
```

## Generating Templates

Now that we have a template and have registered our templates. We can generate them using the Mustr CLI generate command.

```sh
$ mu g db shared/services/db
```

**The above would create the template at:**

./src/shared/services

**The filename would be:**

db.service.ts

**The component name of the service would be:**

DbService

### How Does That Work?

**component**

Because our template front-matter config defines a type the generated component names and file names will be automatially suffixed with this value. If you've used angular-cli this will be familiar to you and probably what you want for your conventions.

**output path**

The mustr.json file defines the source root for your projects so all paths are relative to it for template generation. Hence when we generate a template the path you set in your generation command is respected and output to this location. You can also specify in your template's config that the template has a base "outputDir" which then assumes the template should be generated relative to that specified path rather than the global config path. You can also statically set the path. Imagine for example a LICENSE or README.md. It's likely these types of files will always output to the same root directory.

**component name**

The component name or the ending value you specified in the output path "shared/services/db" in this case "db" is used for the name of the component/template you're generating. You'll notice though that the name is auto suffixed like the file path. This results in this case in "DbService".

The filename is auto cased based on your front-matter config using the property "casing". Valid values are lower, upper, capitalize, title, or camel. Whether you are using suffixes or not Mustr will just figure this out when you specify your desired case. More often than not you want "title" which is essentially titlecase. For anything that is a component/class etc. that's likely what you want.

## Extending Metadata via CLI

Any flags passed in your command line will be respected and overwrite any static metadata used in rendering your template.

```sh
$ mu g db shared/services/db --property value
```

The above will extend or overwrite your metadata object with a key called "property" with the provided "value" as it's value.

Nested values are also possible. You could for example have an object in your metadata such as "user". You override or provide it by doing something like:

```sh
$ mu g db shared/services/db --user name:Bob,age:25
```

OR

```sh
$ mu g db shared/services/db --user.name Bob --user.age 25
```

## Injecting Imports

Usually in the ES6 world you will want create an import of the generated/rendered template into another file. Currently this is done only via a callback in your registration as described above.

```js
mu.register('Db', 'service')
  .afterRender((template) => {

     mu.inject('path/to/file', 'search expression', 'strategy', 'what to inject', () => {
        done();
      });

  });
```

**Inject Inline**

It is also possible to inject inline within your template file. This is done by creating an array in your yaml front-matter. This is very handy as it will create the import to the foriegn file each time a template of this type is created. No fuss no muss just works.

```yaml

config:
  ext: .ts
  component: Service
  casing: title
  injects:
    - filename: 'examples/db.example.tsx'
      find: '// INJECT'
      strategy: 'after'
      insert: "import * as _ from 'lodash';"

```

## Rollbacks

Rollbacks are a handy feature of Mustr. They enable you to quickly rollback to previously generated versions of your components. Not likely that you'll use this feature often but when you need it, it's extremely useful.

**Rollback by ID**

```sh
$ mu rollback 11388399399-view
```

TIP: to view a list of valid rollback ids you can run the command:

```sh
$ mu show rollbacks
```

**Rollback by Index**

After showing current rollback entries you'll notice each entry corresponds to an
index. You can also specify the index and Mustr will sort out which rollback id
it corresponds to. Saves some typing.

```sh
$ mu rollback 3
```

**Rollback by Last**

You can also call rollback with no arguments and the last rollback id will be
automatically selected. Great for whoops I blew that moments.

```sh
$ mu rollback
```

The above would get the third rollback's rollback id and then pass to the "rollback" method in Mustr.

**Rollback Manually**

WARNING: this merely removes the template, useful in the sense that
you can specify the same params you did when you generated it and
Mustr will sort out the rest. Essentially say you generated a template
and just want to remove it you could press up arrow in your console
then change the "g" or "generate" command to "r" or "rollback".
That said always rollback by an id if possible.

```sh
$ mu rollback template output/path
```

## License

See [LICENSE.md](License.md)






