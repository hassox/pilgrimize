var mach = require('mach'),
    app = mach.stack(),
    spawn = require('child_process').spawn,
    yargs = require('yargs'),
    Path = require('path'),
    Glob = require('glob'),
    fs = require('fs'),
    Protofile = require('protob/lib/compiler/protofile').Protofile,
    protoFile,
    protoFilePromise,
    protoFileIndex = {},
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
      .boolean('l')
      .describe('l', 'Host locally')
      .alias('l', 'localhost')
      .default({
        s: false,
        p: 9151,
        b: 'proto-bundle.json',
        o: './',
        f: './protos.json',
        l: true,
      }).argv;

if(argv.help) {
  yargs.showHelp();
  process.exit(0);
}

cmdArgs.push("-o " + Path.resolve( Path.relative(process.cwd(), argv.out).trim() ));
cmdArgs.push("-f " + argv.bundle.trim());
cmdArgs.push("--no-node");
cmdArgs.push(argv.file);

Protofile.protoCache = '.proto_cache';
Protofile.protoPaths.push(argv.file); // argv.file

protoFile = new Protofile();

function indexProtoFiles() {
  protoFileIndex = {};
  protoFile.importPaths().forEach(function(pth) {
    var fullPaths = Glob.sync(Path.join(pth, '**/*.proto'));
    for(var i = 0; i < fullPaths.length; i++) {
      protoFileIndex[Path.relative(pth, fullPaths[i])] = fullPaths[i];
    }
  });
}

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
  indexProtoFiles();
  if(running) return;
  if(argv.localhost) {
    serveApp();
    listenForRecompile();
  }
}


app.use(function(_app) {
  return function(request) {
    return request.call(_app)
    .then(function(resp) {
      resp.addHeader('Access-Control-Expose-Headers', 'X-Proto-Path');
      resp.addHeader('Access-Control-Allow-Origin', '*');
      resp.addHeader('X-Proto-Path', '/proto-file');
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

// Serve up protos
app.get("/proto-file/*.proto", function(conn) {
  var fullFile = protoFileIndex[conn.params.splat + '.proto'];
  if(fullFile) {
    return fs.createReadStream(fullFile);
  } else {
    return { status: 404, content: "Not Found" };
  }
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

