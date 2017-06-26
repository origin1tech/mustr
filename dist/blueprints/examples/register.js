
module.exports = (mu, Engine) => {

  // NAME - the name you wish to register the template under.
  // TEMPLATE - the name, path or static string template to use for the registration.
  // PARTIALS - string, array of strings, object of key value or multi arg of strings.
  // BEFORE_RENDER - callback passing TEMPLATE and done callback.
  // AFTER_RENDER - callback passing TEMPLATE.

  // Usage: mu.register(NAME, TEMPLATE)
  //          .partials('stirng', 'string')
  //          .beforeRender((template, done) => {  done(); })
  //          .afterRender((template) => {  // do something });

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

  // mu.register('DB', 'service');

  // If the template name is the same as the
  // desired name you need merely pass it.
  // as below where the desired name is view
  // and a template exists named view.

  // mu.register('view');

  // You can also override the matter or metadata
  // stored in the static template at register time.

  // mu.register('name', 'template', { rename: false });

  // Static templates may also be passed.
  // This may seem redundant for this simple
  // example but useful when building up more
  // complex use cases.

  // NOTE: third object here uses the following structure
  // where top level properties are the actual template
  // config once parsed/normalized. See ITemplate interface.

  // const config = {
  //  ext: '.ts',
  //  rename: false,
  //  metadata: { /* your template properties here */ }
  // }

  // mu.register('name', 'email: {{email}}', { metadata: { email: 'name@email.com } });

  /* Component Register
  *******************************************/

  // Registering a component allows generating multiple files
  // using a single command. It's important to know that
  // the component templates must be already registered by
  // calling mu.register();

  // mu.registerComponent('group', 'template1', 'template2');

  /* Partials Register
  *******************************************/

  // Mustr supports partials as well. You could handle
  // partials manually in the callback (see advanced below)
  // however in most cases it's easiest to just pass
  // the logicless partials in your reigster command.
  // They will then be automatically rendered using your
  // front matter and/or flags passed in cli.

  // mu.register('Db', 'service').partials('author');

  // // OR

  // mu.register('Db', 'service').partials(['author', 'footer'])

  // // OR

  // mu.register('Db', 'service').partials('header', 'author', 'footer');

  /* Advanced Register
  *******************************************/

  // When registring with a callback the template can
  // be manipulated before rendering.
  // For even greater control of each step see
  // tests folder to see how you can build
  // each step and render manually.

  // mu.register('Db', 'service')
  //   .beforeRender((template, done) => {

  //     // do something with template
  //     // then call done to auto render.
  //     done();

  //   })
  //   .afterRender((template) => {

  //     // The file is rendered and written out.
  //     // Below is an example of manually calling
  //     // the .inject() method to inject for example
  //     // an import for the filed created.

  //     mu.inject('path/to/file', 'search expression', 'strategy', 'what to inject', () => {
  //       done();
  //     });

  //   });

  /* Changing Template Engine
  *******************************************/

  // Don't like Mustache? You can use whatever
  // templating engine you wish. Mustr merely
  // handles some fancy things for paths and
  // front matter/metadata. You can use whatever
  // rendering engine you wish.

  // const Jade = require('jade');
  // const renderer = (body, meta) => {
  //    const template = jade.compile(body, /* jade options */);
  //    return template(meta);
  // }
  // mu.setEngine(Jade, renderer);

};