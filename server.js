var sidekiq, enqueuePing,
    cluster = require('cluster'),
    numWorkers = require('os').cpus().length,
    http = require('http'),
    url = require('url'),
    redisCon = require('redis').createClient(),
    Sidekiq = require('sidekiq');

sidekiq = new Sidekiq(redisCon);

enqueuePing = function(params) {
  sidekiq.enqueue("PingWorker", {params: params}, {});
};

if (cluster.isMaster) {
  for (var i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", function(worker, code, signal) {
    var exitCode = worker.process.exitCode;
    console.log("worker " + worker.process.pid + " died (" + exitCode + "). restarting...");
    cluster.fork();
  });
} else {
  http.createServer(function(req, res){
    var url_parts;
    res.writeHeader(200, {"Content-type": "text/html"});

    url_parts = url.parse(req.url, true);
    if (url_parts.pathname === '/ping') {
      enqueuePing(url_parts.query);
      console.log("[PING]: " + JSON.stringify(url_parts.query));
    }

    res.write("OK");
    res.end();
  }).listen(8888);
};
