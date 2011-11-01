var   username = 'fabricio'
    , first_page_host = 'www.google.com'
    , first_page_path = '/reader/shared/' + username;

var   http = require('http');

function ResponseMeta(){
  this.html = '';
  this.feedURL = '';
}

function getFirstPage(){
  console.log('Getting first page: http://' + first_page_host + first_page_path);
  http.get({host: first_page_host, path: first_page_path}, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.meta = new ResponseMeta();
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      var feedURLPattern = /<link[^>]*rel\=\"alternate\"[^>]*href\=\"([^\"]*)\"/ig
          , matches = null;
      if (this.meta.feedURL === ''){
        matches = feedURLPattern.exec(this.meta.html);
        if (matches){
          this.meta.feedURL = matches[1];
        }
      }
      this.meta.html += chunk;
      
    });  
    res.on('end', function () {
      console.log('end');
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

getFirstPage();