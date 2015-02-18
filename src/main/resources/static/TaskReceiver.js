'use strict';

function TasksReceiver(address) {

    var finishOnError = false;
    var activeTasks = {};

    var user;

    TasksReceiver.prototype.init = function(uiid) {

        var location = 'ws://' + address + '/ui/' + uiid;
        taskReceiver._ws = new WebSocket(location);
        taskReceiver._ws.onopen = this._onopen;
        taskReceiver._ws.onmessage = this._onmessage;
        taskReceiver._ws.onclose = this._onclose;
        taskReceiver._ws.onerror = this._onerror;

        user = uiid;
    };

    TasksReceiver.prototype._onopen = function() {
        $('#connect').remove();
        $('.userui').removeClass('hidden');
    };

    TasksReceiver.prototype._onmessage = function(m) {
        var msg = JSON.parse(m.data);
        switch (msg.type) {

        case 'FINISHED':
            var containerDiv = $('#processcontainer' + msg.processid);
            var processFinished = document.createElement('p');
            processFinished.innerHTML = '<p>Process ' +
                msg.processid + ' finished.</p><hr>'
            containerDiv.append(processFinished);
            break;

        case 'ADDTASK':
            var newTask = task(address, msg.taskid, user);
            activeTasks[msg.taskid] = newTask;
            newTask.join();
            break;

        case 'DELTASK':
            // may be undefined if task was closed from another ui
            activeTasks[msg.taskid].end();
            delete activeTasks[msg.taskid];
            break;
        }
    };

    TasksReceiver.prototype._onclose = function(m) {
        Object.keys(activeTasks).forEach(function(taskid) {
            activeTasks[taskid].end();
            delete activeTasks[taskid];
        });
        delete taskReceiver._ws;
        if (finishOnError) {
            alert(
                'The following error occurred: ' +
                    m.reason +
                    ' (' + m.code + ')'
            );
        }
    };

    TasksReceiver.prototype._onerror = function(e) {
        finishOnError = true;
    };
}
