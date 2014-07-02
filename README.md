logs2indexeddb
==============

Utility that saves all javascript console logs into the IndexedDB database.
You can access console.* logs after the browser tab was closed.
This utility is a good choise for developers that need to analyze web client logs after a time.

==============
Version 0.0.1

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

Open console2db_test.html and look through the code and comments on the page. Also look into Javascript Console of errors occur.

To download a file with all logs from database:

    l2i.download();

You can invoke it right from Javascript Console or attach to buttom click event handler.