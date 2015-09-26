/**
 * User: Alexander Volkov volk@frgroup.ru
 * Date: 02.07.14
 * Time: 11:16
 *
 * Common usage to start saving logs from original console is:
 * l2i.init(function() {
 *     l2i.on();
 * });
 * After that you can use methods like
 *      console.log('My message');
 * and all of the logs will be in both Javascript Console and IndexedDB named logs2indexeddb.
 *
 * To clear the databases (logs2indexeddb and logs2indexeddb_test if you have used the performance test) you can use:
 *      l2i.clear();
 * or
 *      l2i.clearAndDrop();
 * to additionally drop the database(s).
 */

var l2i = {
    /**
     * Is set with true or false after l2i.init() invocation.
     */
    isIndexedDBSupported: null,
    //// private variables
    databaseName: "logs2indexeddb",
    database: null,
    /**
     * Initializes window.indexedDB and l2i.isIndexedDBSupported.
     * @param callbackSuccess invokes if browser supports IndexedDB.
     * @param callbackFail (optional) invokes if browser does not supports IndexedDB.
     */
    init: function(callbackSuccess, callbackFail) {
        // In the following line, you should include the prefixes of implementations you want to test.
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // DON'T use "var indexedDB = ..." if you're not in a function.
        // Moreover, you may need references to some window.IDB* objects:
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

        if (!window.indexedDB) {
            if(callbackFail) {callbackFail();}
        }
        else {
            if(!callbackSuccess) {
                throw "IllegalAgrumentException. Please provide a callback for success initialization";
            }
            callbackSuccess();
        }
    },
    /**
     * Turns on catching all console.* methods invocations and saving logs into IndexedDB
     * @param callback (optional) is invoked then database is successfully opened and console is replaced with l2i.log2both.
     */
    on: function(callback) {
        if( l2i.consoles.originalIsOn === false ) {
            l2i.consoles.originalIsOn = true;
            if( l2i.database != null ) {
                l2i.replaceConsoleThenOn(callback);
            }
            else {
                l2i.openDb(l2i.databaseName, function() {
                    l2i.replaceConsoleThenOn(callback);
                });
            }
        }
    },
    off: function() {
        if( l2i.consoles.originalIsOn === true ) {
            console = l2i.consoles.original;
            l2i.consoles.originalIsOn = false;
        }
    },
    isOn: function() {
        return l2i.consoles.originalIsOn;
    },
    clear: function() {
        if(l2i.database == null) {
            throw "IllegalStateException: need to l2i.init() and l2i.on before clearing the database, e.g. l2i.init(function(){l2i.on(function(){l2i.clear();});});";
        }
        l2i.consoles.original.log("l2i.clear");
        var objectStore = l2i.database.transaction("logs").objectStore("logs");

        objectStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                // cursor.key + "=" + cursor.value
                var request = l2i.database.transaction(["logs"], "readwrite").objectStore("logs").delete(cursor.key);
                request.onsuccess = function(event) {
                    // It's gone!
                };
                cursor.continue();
            }
            else {
                l2i.consoles.original.log("logs2indexeddb successfully cleared");
            }
        };
    },
    /**
     * Opens a file with logs.
     * If parameters are null (not specified) then method downloads all logs from database.
     * If parameters are specified, then the method filters logs and provide only records
     * that were created since fromDate to toDate.
     * @param fromDate (optional)
     * @param toDate (optional)
     */
    download: function(fromDate, toDate) {
        var fromTime = null;
        var toTime = null;
        if(fromDate != null) {
            if(toDate != null) {
                if(typeof(fromDate.getTime) === "undefined" || typeof(toDate.getTime) === "undefined" ) {
                    throw "IllegalArgumentException: parameters must be Date objects";
                }
                fromTime = fromDate.getTime();
                toTime = toDate.getTime();
            }
            else {
                throw "IllegalArgumentException: Please provide either both parameters or none of them";
            }
        }
        var objectStore = l2i.database.transaction("logs").objectStore("logs");

        var data = '';
        objectStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                var v = cursor.value;
                if( fromTime == null || fromTime <= v.time && v.time <= toTime) {
                    data += new Date(v.time*1)+" "+ v.label+" "+ v.log+"\n";
                }
                cursor.continue();
            }
            else {
                l2i.downloadFile(data);
            }
        };
    },
    downloadToday: function() {
        var start = new Date();
        start.setHours(0,0,0,0);

        var end = new Date();
        end.setHours(23,59,59,999);
        l2i.download(start, end);
    },
    /**
     * @private
     */
    downloadFile: function(data){
        if(!data) {
            l2i.consoles.original.log("l2i.download: Empty database");
            return;
        }
        var filename = 'console.log'

        var blob = new Blob([data], {type: 'text/plain'}),
            e    = document.createEvent('MouseEvents'),
            a    = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl =  ['text/plain', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    },
    clearAndDrop: function() {
        l2i.clear();
        // todo replace with database drop
    },
    consoles: {
        originalIsOn: false,
        /**
         * @private Logs into both - console and indexeddb
         */
        both: {
            build_string: function(/* ... printf-like arguments ... */){
              if (arguments.length == 0)
                return;
              var i = 0;
              var strings = [];
              var tokens = arguments[0].split("%s"); // we only handle %s
              if (tokens.length > 1) {
                var merged = [];
                for (var l=tokens.length-1; i < l; i++){
                  merged.push(tokens[i] || "");
                  merged.push(arguments[1+i]);
                }
                merged.push(tokens[i]);
                strings.push([merged.join("")]);
                i++;
              }
              for (var l = arguments.length; i < l; i++){
                strings.push(arguments[i]);
              }
              return strings.join(" ");
            },
            log: function() {
                l2i.consoles.original.log.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.log(this.build_string.apply(this,arguments));
            },
            warn: function() {
                l2i.consoles.original.warn.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.warn(this.build_string.apply(this,arguments));
            },
            trace: function() {
                l2i.consoles.original.trace.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.trace(this.build_string.apply(this,arguments));
            },
            error: function() {
                l2i.consoles.original.error.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.error(this.build_string.apply(this,arguments));
            },
            info: function() {
                l2i.consoles.original.info.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.info(this.build_string.apply(this,arguments));
            },
            debug: function() {
                l2i.consoles.original.debug.apply(l2i.consoles.original,arguments);
                l2i.consoles.indexeddb.debug(this.build_string.apply(this,arguments));
            }
        },
        /**
         * @private Original console logger. No matter if l2i is on or off. Is used for internal l2i logging during test.
         */
        original: console,
        /**
         * @public Logger that saves data into opened IndexedDB.
         */
        indexeddb: {
            log: function(str) {
                l2i.consoles.indexeddb.write2db('log', str);
            },
            warn: function(str) {
                l2i.consoles.indexeddb.write2db('warn', str);
            },
            trace: function(str) {
                l2i.consoles.indexeddb.write2db('trace', str);
            },
            error: function(str) {
                l2i.consoles.indexeddb.write2db('error', str);
            },
            info: function(str) {
                l2i.consoles.indexeddb.write2db('info', str);
            },
            debug: function(str) {
                l2i.consoles.indexeddb.write2db('debug', str);
            },
            write2db: function(label, str) {
                var time = new Date();
                time.setMonth(time.getMonth()-1);
                var data = {
                    time: time.getTime()+'',
                    label: label,
                    log: str
                };
                l2i.database.transaction(["logs"], "readwrite").objectStore("logs").add(data);
            }
        }
    },
    exceptions: {
        uncatchable: {
            on: function() {
                if( l2i.isOn() ) {
                    window.onerror = l2i.exceptions.uncatchable.onerror.both;
                }
                else {
                    l2i.consoles.original.warn("l2i needs to be on to start catch uncatchable exceptions");
                }
            },
            off: function() {
                window.onerror = l2i.exceptions.uncatchable.onerror.original;
            },
            onerror: {
                original: window.onerror,
                /**
                 * Logs exception into the database
                 */
                custom: function (errorMsg, url, lineNumber) {
                    l2i.consoles.indexeddb.error(errorMsg+" "+url+" line:"+lineNumber);
                    return false;
                },
                both: function (errorMsg, url, lineNumber) {
                    l2i.exceptions.uncatchable.onerror.custom("UNCATCHABLE: ----------------"+errorMsg, url, lineNumber);
                    if( l2i.exceptions.uncatchable.onerror.original ) {
                        l2i.exceptions.uncatchable.onerror.original(errorMsg, url, lineNumber);
                    }
                }
            }
        }
    },
    /**
     * @private Opens database and updates schema if needed.
     * @param dbName database name
     * @param callbackSuccessOpen (optional) invoked after success connect and update.
     * @param onupgradeneeded (optional) function to create different structure of the database.
     */
    openDb: function(dbName, callbackSuccessOpen, onupgradeneeded) {
        l2i.consoles.original.log("openDb ...");
        // Let us open our database
        var request = indexedDB.open(dbName, 2);
        request.onerror = function (event) {
            alert("Why didn't you allow my web app to use IndexedDB?!");
            l2i.consoles.original.error("openDb:", event.target.errorCode);
        };
        request.onsuccess = function (e) {
            l2i.database = request.result;
            l2i.consoles.original.log("openDb DONE");
            l2i.database.onerror = function (event) {
                // Generic error handler for all errors targeted at this database's
                // requests!
                l2i.consoles.original.error("Database error: " + event.target.errorCode);
            };
            if(callbackSuccessOpen) {callbackSuccessOpen();}
        };
        // This event is only implemented in recent browsers
        request.onupgradeneeded = function (event) {
            l2i.consoles.original.log("openDb.onupgradeneeded");
            var db = event.target.result;

            var objectStore = db.createObjectStore("logs", { autoIncrement : true });

            // Create an index to search by time
            objectStore.createIndex("time", "time", { unique: false });
            objectStore.createIndex("label", "label", { unique: false });

            objectStore.transaction.oncomplete = function (event) {
                l2i.consoles.original.log("openDb.onupgradeneeded.transaction.oncomplete");
            }
        };
    },
    /**
     * @private
     */
    replaceConsoleThenOn: function(callback) {
        console = l2i.consoles.both;
        l2i.exceptions.uncatchable.on();
        if( callback ) callback();
    },
    /**
     * Performance test methods.
     * Use
     *      $(function () {                 // This is JQuery construction that needed to be sure that html document is loaded
                l2i.init(function() {// successfully initialized
                    l2i.debug.startIndexedDBTest(5000, 'status');
                }, function() {// error
                    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
                    l2i.debug.status.html("<span style='color: red;>Error: Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.</span>");
                });
            });
     *      <p id="status"></p>
     * to test 5000 writes.
     */
    debug: {
        statusElementId: null,
        startTime: null,
        totalNumberOfWrites: null,

        /**
         * Opens database and starts WriteTest
         * @param n number of records to write during the test.
         * @param statusElementId html element's id to write results of the test.
         */
        startIndexedDBTest: function(n, statusElementId) {
            if( !n || !statusElementId ) {
                throw "IllegalArgumentsException";
            }
            l2i.debug.statusElementId = statusElementId;
            l2i.debug.status('Testing...');

            l2i.openDb("logs2indexeddb_test", function() {
                l2i.debug.processWriteTest(l2i.database, n);
            }, l2i.debug.onupgradeneeded);
        },
        onupgradeneeded:  function (event) {
            l2i.consoles.original.log("debug.onupgradeneeded");
            var db = event.target.result;

            // Create an objectStore to hold information about our customers. We're
            // going to use "ssn" as our key path because it's guaranteed to be
            // unique.
            var objectStore = db.createObjectStore("customers", { keyPath: "ssn" });

            // Create an index to search customers by name. We may have duplicates
            // so we can't use a unique index.
            objectStore.createIndex("name", "name", { unique: false });

            // Create an index to search customers by email. We want to ensure that
            // no two customers have the same email, so use a unique index.
            objectStore.createIndex("email", "email", { unique: true });

            // Use transaction oncomplete to make sure the objectStore creation is
            // finished
            objectStore.transaction.oncomplete = function (event) {
                l2i.consoles.original.log("debug.onupgradeneeded.transaction.oncomplete");
            }
        },
        /**
         * @private
         */
        processWriteTest: function(db, n) {
            l2i.consoles.original.log("processWriteTest");

            l2i.debug.status('Connected to database. Preparing to process ' + n + " writes.");
            alert("The test can take a lot of time (1-2 minutes). The browser can be locked duting the test. Ready to launch?");
            l2i.debug.status("Testing... Please wait until test will be finished.");

            l2i.debug.totalNumberOfWrites = n;
            l2i.debug.startTime = new Date();
            for (var i = 0; i < n; i++) {
                //                    status("Writing "+i+" record...");                          // Comment this to get real time estimate
                l2i.debug.processWrite(db, i);
            }
            // The write will be finished after last callback
        },
        /**
         * @private
         */
        testFinished: function () {
            l2i.consoles.original.log("testFinished");
            var n = l2i.debug.totalNumberOfWrites;
            var end = new Date();
            var diff = end.getMinutes() * 60 + end.getSeconds() - (l2i.debug.startTime.getMinutes() * 60 + l2i.debug.startTime.getSeconds());
            var mean = diff / n;

            alert("Done. Check the result on the page.");
            l2i.debug.status("One write request takes <b>" + mean + "</b> seconds.<br>Test time: " + diff + " seconds");
        },
        /**
         * @private
         */
        processWrite: function (db, i) {
            //                l2i.consoles.original.log("processWrite");
            var transaction = db.transaction(["customers"], "readwrite");

            // Do something when all the data is added to the database.
            transaction.oncomplete = function (event) {
                //                    l2i.consoles.original.log("processWrite.transaction.oncomplete");
            };

            transaction.onerror = function (event) {
                // Don't forget to handle errors!
                //                    l2i.consoles.original.error("processWrite.transaction.onerror: "+event.code);
            };

            var objectStore = transaction.objectStore("customers");

            var data = { ssn: i, name: "Bill", age: 35, email: "mail" + i + "@rtlservice.com" }
            var request = objectStore.put(data);
            request.onsuccess = function (event) {
                // event.target.result == customerData[i].ssn;
                //                    l2i.consoles.original.log("processWrite.transaction...onsuccess: "+event.target.result);
                if (i == l2i.debug.totalNumberOfWrites - 1) {
                    l2i.debug.testFinished();
                }
            };
            request.onerror = function () {
                l2i.consoles.original.error("addPublication error", this.error);
            }
        },
        status: function (str) {
            document.getElementById(l2i.debug.statusElementId).innerHTML = str;
        }
    }
}