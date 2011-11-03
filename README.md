# Google Reader Shared Items Backup

## Is this tool for me?

Google Reader already have an option to export all your shared items as json,
its easier and fastest to use that instead: https://www.google.com/reader/settings?display=import

But if you are not happy with the format of Google exporting defaults or if 
you want to mirror what is on the public html and atom feeds of a public shared
items blog such as http://www.google.com/reader/shared/fabricio then this 
tool might be for you.

Warning: this is a lousy crawler, it is buggy and badly written, a hack. 
With no warranties of any kind, use it at your own risk.


## How to use

1. edit the get.js and replace your username on line #2 (your shared items must be public)
2. (optional) you can limit the number of xmls or htmls by tweaking the ```pages_to_fetch``` and ```xmls_to_fetch```
  - use ```pages_to_fetch = 1``` and ```xmls_to_fetch = -1``` if you want only the xml (-1 stands for all pages)
  - by default the script will fetch all html pages and all atom feeds (this can take a while)
3. run the file: ```node get.js```
