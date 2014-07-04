logs2indexeddb
==============

Utility that saves all javascript console logs into the IndexedDB database continuously.
You can access console.* logs after the browser tab was closed.
This utility is a good choise for developers that need to analyze web client logs after a time.

==============

Example:

    l2i.init(function() {// successfully initialized
        l2i.on(function() {
            console.log('one');
            console.log('two');
            console.log('three');
            console.log('444');
        });
    });
    ...
    console.log('5');
    console.log('6');
    ...

How to check that it works:

Open console2db_test.html and look through the code and comments on the page. Also look into Javascript Console for errors (if occur).

==============
Check logs after a while:

To download a file with all logs from the database:

    l2i.download();

To download a file with logs created today:

    l2i.downloadToday();

To download logs for the given period use:

    l2i.download(fromDate, toDate);

You can invoke it right from Javascript Console or attach to a button click event handler.


==============
To clear old logs in the database:

    l2i.clear();

==============
Uncatchable exceptions

l2i catches all uncatchable exceptions then on. However, you can turn this off if you needs only clear logs (produced using console.* methods):

    l2i.exceptions.uncatchable.off();