//config
var   username = 'fabricio'
    , pages_to_fetch = 1
    , xmls_to_fetch = 3
    , html_path = './html/'
    , xml_path = './xml/';

//libs
var   http = require('http')
    , fs = require('fs')
    , urllib = require('url');

// global vars
var   first_page_host = 'www.google.com'
    , first_page_path = '/reader/shared/' + username
    , pages_fetched = 0
    , xmls_fetched = 0
    , xml_fetches_started = 0
    , html_fetches_started = 0
    , items_fetched = 0
    , pageNames = []
    , downloadedPages = {'html': fs.readdirSync(html_path), 'xml':  fs.readdirSync(xml_path)}
    , startingTime = Date.now();

function ResponseMeta(){
  this.content = '';
  this.url = '';
  this.feedURL = '';
  this.nextHTMLPage = '';
}
function urlToHTMLFilename(url){
  return url.replace(/\/|\?|\=/g,'_');
}
function saveDownloadedContent(pageMeta, type){
  var   dir = type == 'html' ? html_path : xml_path
      , filename = dir + urlToHTMLFilename(pageMeta.url) + '.' + type;
  fs.writeFile(filename, pageMeta.content, function (err) {
    if (err) throw err;
    console.log(filename+' saved!');
  });
}
function updateMetaFeed(meta){
  var feedURLPattern = /<link[^>]*rel\=\"alternate\"[^>]*href\=\"([^\"]*)\"/i;
  var matches = feedURLPattern.exec(meta.content);
  if (matches){
    meta.feedURL = matches[1];
    getFeed(meta.feedURL);
  }
}
function loadNextPage(meta){
  if (((pages_to_fetch === -1)||(html_fetches_started < pages_to_fetch)) && (meta.nextHTMLPage !== '')){
    console.log('Get next page: '+meta.nextHTMLPage.replace(/[^\/]*\/\/[^\/]*/gi, ''));
    getPage(meta.nextHTMLPage.replace(/[^\/]*\/\/[^\/]*/gi, ''));
  }else {
    console.log('no next pages');
  }
}
function updateMetaNextPage(meta){
  var nextPagePattern = /<div[^>]*id\=\"more\"[^<]*<a href=\"([^\"]*)\"/i;
  var matches = nextPagePattern.exec(meta.content);
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
  var filename = urlToHTMLFilename(first_page_host+path)+'.html';
  var filemeta = new ResponseMeta();
  html_fetches_started++;
  pageNames.push(filename);
  //test if the page is in cache already
  if (downloadedPages.html.indexOf(filename) >=0 ){
    console.log('Page '+path+' was dowloaded already. Reading the file... ');
    fs.readFile(html_path+filename, 'utf8', function (err, data) {
      if (err) throw err;
      filemeta.content = data;
      pageLoaded(filemeta);
    });
  }else{
    console.log('Getting page: http://' + first_page_host + path);
    http.get({host: first_page_host, path: path}, function(res) {
      console.log('STATUS: ' + res.statusCode);
      res.meta = filemeta;
      res.meta.url = first_page_host + res.socket._httpMessage.path;
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        this.meta.content += chunk;
        checkForNewMetadata(this.meta);
      });  
      res.on('end', function () {
        console.log('end');
        saveDownloadedContent(this.meta, 'html');
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
function getFeed(url){
  var   parsed_url = urllib.parse(url)
      , path = parsed_url.pathname
      , host = parsed_url.host
      , filename = urlToHTMLFilename(host+path)+'.xml'
      , filemeta = new ResponseMeta();
  xml_fetches_started++;
  filemeta.url = host+path;
  console.log(parsed_url);
  //test if the page is in cache already
  if (downloadedPages.xml.indexOf(filename) >=0 ){
    console.log('Feed '+path+' was dowloaded already. Reading the file... ');
    fs.readFile(xml_path+filename, 'utf8', function (err, data) {
      if (err) throw err;
      filemeta.content = data;
      feedLoaded(filemeta);
    });
  }else{
    console.log('Getting feed: ' + url);
    http.get({host: host, path: path}, function(res) {
      console.log('STATUS: ' + res.statusCode);
      res.meta = filemeta;
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        this.meta.content += chunk;
        // checkForNewMetadata(this.meta);
      });  
      res.on('end', function () {
        console.log('feed downloaded');
        saveDownloadedContent(this.meta, 'xml');
        feedLoaded(this.meta);
      });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  }
}
function feedLoaded(meta){
  console.log('feed loaded');
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