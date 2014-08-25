var mach = require('mach'),
    app = mach.stack(),
    spawn = require('child_process').spawn,
    yargs = require('yargs'),
    Path = require('path'),
    cmdArgs = [],
    compiling = false,
    running = false,
    bundleFile,
    argv = yargs
      .usage('Serve your protos with CORS so you can access them in pilgrim.\nUsage: $0')
      .boolean('h')
      .alias('h', 'help')
      .describe('h', 'Display help')
      .boolean('s')
      .alias('s', 'skip')
      .describe('s', 'Skip compiling protos')
      .alias('f', 'file')
      .describe('f', 'Use the file as your protos file')
      .alias('p', 'port')
      .describe('p', 'Set local serving port')
      .describe('b', 'Set your proto bundle file')
      .alias('b', 'bundle')
      .describe('o', 'Output directory')
      .alias('o', 'out')
      .default({
        s: false,
        p: 9151,
        b: 'proto-bundle.json',
        o: './',
        f: './protos.json'
      }).argv;

if(argv.help) {
  yargs.showHelp();
  process.exit(0);
}

cmdArgs.push("-o " + Path.resolve( Path.relative(process.cwd(), argv.out).trim() ));
cmdArgs.push("-f " + argv.bundle.trim());
cmdArgs.push("--no-node");
cmdArgs.push(argv.file);

function compileProtos() {
  if(compiling) return; 
  compiling = true;

  var cmd = Path.join(Path.resolve(__dirname), "node_modules/protob/bin/protob"),
      child;

  child = spawn(cmd, cmdArgs, { cwd: process.cwd() });

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('close', function(code) {
    if(!code) {
      console.log("Finished compiling");
    } else {
      console.error("Could not compile protos");
    }
    compiling = false;
    run();
  });
}

function run() {
  if(running) return;
  serveApp();
  listenForRecompile();
}


app.use(function(app) {
  return function(request) {
    return request.call(app)
    .then(function(resp) {
      resp.addHeader('Access-Control-Allow-Origin', '*');
      return resp;
    });
  };
});

// Setup the server
app.use(mach.gzip);
app.use(mach.file, {
  root: process.cwd(),
  useLastModifier: false,
  useETag: false
});

if(!argv.skip) {
  compileProtos();
} else {
  run();
}

function serveApp() {
  serveApp = function() {};
  mach.serve(app, argv.port);
}

function listenForRecompile() {
  console.log("Hit enter to recompile your protos");
  process.stdin.on('data', function(data) { if(!compiling) compileProtos(); });
}


