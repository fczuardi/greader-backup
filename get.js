//config
var   username = 'fabricio'
    , pages_to_fetch = -1
    , xmls_to_fetch = -1
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
    , pages_ended = false
    , feeds_ended = false
    , pageNames = []
    , feedNames = []
    , downloadedPages = {'html': fs.readdirSync(html_path), 'xml':  fs.readdirSync(xml_path)}
    , startingTime = Date.now();

function ResponseMeta(){
  this.content = '';
  this.url = '';
  this.search = '';
  this.feedURL = '';
  this.nextHTMLPage = ''
  this.nextFeed = '';
  this.type = ''
}
function urlToHTMLFilename(url){
  return url.replace(/\/|\?|\=/g,'_');
}
function saveDownloadedContent(pageMeta, type){
  var   dir = type == 'html' ? html_path : xml_path
      , filename = dir + urlToHTMLFilename(pageMeta.url+pageMeta.search) + '.' + type;
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
  if ((xml_fetches_started == 0) && (meta.feedURL === '')){
    updateMetaFeed(meta);
  }
  if (meta.nextHTMLPage === ''){
    updateMetaNextPage(meta);
  }
}
function updateMetaNextFeed(meta){
  var nextFeedPattern = /<gr:continuation>([^<]*)/i;
  var matches = nextFeedPattern.exec(meta.content);
  if (matches != null){
    meta.nextFeed = 'http://' + meta.url + '?c=' +matches[1];
    loadNextFeed(meta);
  }
}
function loadNextFeed(meta){
  if (((xmls_to_fetch === -1)||(xml_fetches_started < xmls_to_fetch)) && (meta.nextFeed !== '')){
    getFeed(meta.nextFeed);
  }else {
    console.log('no next pages');
  }
}
function checkForNewXMLMetadata(meta){
  if (meta.nextFeed === ''){
    updateMetaNextFeed(meta);
  }
}
function getPage(path){
  var filename = urlToHTMLFilename(first_page_host+path)+'.html';
  var filemeta = new ResponseMeta();
  html_fetches_started++;
  pageNames.push(filename);
  filemeta.type = 'html';
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
      res.meta = filemeta;
      res.meta.url = first_page_host + res.socket._httpMessage.path;
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        this.meta.content += chunk;
        checkForNewMetadata(this.meta);
      });  
      res.on('end', function () {
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
  checkEnd(meta);
}
function getFeed(url){
  var   parsed_url = urllib.parse(url)
      , path = parsed_url.pathname
      , host = parsed_url.host
      , search = parsed_url.search ? parsed_url.search : ''
      , filename = urlToHTMLFilename(host+path+search)+'.xml'
      , filemeta = new ResponseMeta();
  xml_fetches_started ++;
  filemeta.url = host+path;
  filemeta.search = search;
  filemeta.type = 'xml';
  
  if (feedNames.indexOf(filename) != -1) { return }
  feedNames.push(filename);
  //test if the page is in cache already
  if (downloadedPages.xml.indexOf(filename) >=0 ){
    console.log('Feed '+filename+' was dowloaded already. Reading the file... ');
    fs.readFile(xml_path+filename, 'utf8', function (err, data) {
      if (err) throw err;
      filemeta.content = data;
      feedLoaded(filemeta);
    });
  }else{
    console.log('Getting feed: ' + url);
    http.get({host: host, path: path+search}, function(res) {
      res.meta = filemeta;
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        this.meta.content += chunk;
        checkForNewXMLMetadata(this.meta);
      });  
      res.on('end', function () {
        saveDownloadedContent(this.meta, 'xml');
        feedLoaded(this.meta);
      });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  }
}
function feedLoaded(meta){
  xmls_fetched ++;
  checkForNewXMLMetadata(meta);
  checkEnd(meta);
}
function checkEnd(meta){
  if (meta.type == 'html') {
    if (  ((pages_to_fetch !== -1) && (pages_fetched == pages_to_fetch)) ||
          ((pages_to_fetch === -1) && (meta.nextHTMLPage === ''))        ){
      pages_ended = true;
    }
  }
  if (meta.type == 'xml') {
    if ( ((xmls_to_fetch !== -1)&&(xmls_fetched == xmls_to_fetch)) ||
       ((xmls_to_fetch === -1)&&(meta.nextFeed === ''))                ){
      feeds_ended = true;
    }
  }
  if (pages_ended && feeds_ended){
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
  console.log('Feeds fetched: '+feedNames.length);
  console.log('Elapsed time: '+(Date.now()-startingTime));
  // console.log(feedNames);
}

init();