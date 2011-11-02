var   username = 'fabricio'
    , first_page_host = 'www.google.com'
    , first_page_path = '/reader/shared/' + username
    , pages_to_fetch = -1
    , html_path = './html/';
    
var   http = require('http')
    , fs = require('fs');

var   pages_fetched = 0
    , started_loading = 0
    , items_fetched = 0
    , xmls_fetched = 0
    , pageNames = []
    , downloadedHTMLPages = fs.readdirSync(html_path)
    , startingTime = Date.now();

function ResponseMeta(){
  this.html = '';
  this.feedURL = '';
  this.pageURL = '';
  this.nextHTMLPage = '';
}
function urlToHTMLFilename(url){
  return url.replace(/\/|\?|\=/g,'_')+'.html';
}
function saveDownloadedPage(pageMeta){
  var filename = html_path+urlToHTMLFilename(pageMeta.pageURL);
  fs.writeFile(filename, pageMeta.html, function (err) {
    if (err) throw err;
    console.log(filename+' saved!');
  });
}
function updateMetaFeed(meta){
  var feedURLPattern = /<link[^>]*rel\=\"alternate\"[^>]*href\=\"([^\"]*)\"/i;
  var matches = feedURLPattern.exec(meta.html);
  if (matches){
    meta.feedURL = matches[1];
  }
}
function loadNextPage(meta){
  if (((pages_to_fetch === -1)||(started_loading < pages_to_fetch)) && (meta.nextHTMLPage !== '')){
    console.log('Get next page: '+meta.nextHTMLPage.replace(/[^\/]*\/\/[^\/]*/gi, ''));
    getPage(meta.nextHTMLPage.replace(/[^\/]*\/\/[^\/]*/gi, ''));
  }else {
    console.log('no next pages');
  }
}
function updateMetaNextPage(meta){
  var nextPagePattern = /<div[^>]*id\=\"more\"[^<]*<a href=\"([^\"]*)\"/i;
  var matches = nextPagePattern.exec(meta.html);
  if (matches != null){
    meta.nextHTMLPage = matches[1];
    loadNextPage(meta);
  }
}
function checkForNewMetadata(meta){
  if (meta.feedURL === ''){
    updateMetaFeed(meta);
  }
  if (meta.nextHTMLPage === ''){
    updateMetaNextPage(meta);
  }
}
function getPage(path){
  var filename = urlToHTMLFilename(first_page_host+path);
  var filemeta = new ResponseMeta();
  started_loading++;
  pageNames.push(filename);
  //test if the page is in cache already
  if (downloadedHTMLPages.indexOf(filename) >=0 ){
    console.log('Page '+path+' was dowloaded already. Reading the file... ');
    fs.readFile(html_path+filename, 'utf8', function (err, data) {
      if (err) throw err;
      filemeta.html = data;
      pageLoaded(filemeta);
    });
  }else{
    console.log('Getting page: http://' + first_page_host + path);
    http.get({host: first_page_host, path: path}, function(res) {
      console.log('STATUS: ' + res.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.meta = filemeta;
      res.meta.pageURL = first_page_host + res.socket._httpMessage.path;
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        this.meta.html += chunk;
        checkForNewMetadata(this.meta);
      });  
      res.on('end', function () {
        console.log('end');
        saveDownloadedPage(this.meta);
        pageLoaded(this.meta);
      });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  }
}
function pageLoaded(meta){
  pages_fetched ++;
  checkForNewMetadata(meta);
  if (  ((pages_to_fetch !== -1)&&(pages_fetched == pages_to_fetch)) ||
        ((pages_to_fetch === -1)&&(meta.nextHTMLPage === '')) ){
    end();
  }
}
function getFirstPage(){
  getPage(first_page_path);
}
function init(){
  
  getFirstPage();
}
function end(){
  console.log('Pages fetched: '+pageNames.length);
  console.log('Elapsed time: '+(Date.now()-startingTime));
}

init();