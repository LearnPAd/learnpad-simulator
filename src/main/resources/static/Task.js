function task(address, taskid, user) {

    var newTask = {};
    newTask.closeOnError = false;
    newTask.ws = {};

    newTask.join = function() {
        var location = 'ws://' + address + '/tasks/' + taskid
        this.ws = new WebSocket(location);
        this.ws.onopen = newTask._onopen;
        this.ws.onmessage = newTask._onmessage;
        this.ws.onclose = newTask._onclose;
        this.ws.onerror = newTask._onerror;
    };

    newTask.end = function() {
        $('#taskFormDiv' + taskid).remove();
        $('#taskcontainer' + taskid).addClass('disabled');
        this.ws.onclose('');
    };

    newTask.send = function(data) {
        this.ws.send(JSON.stringify(data));
    };

    newTask._onopen = function() {
        // send subscription msg indicating user
        newTask.send({ 'type' : 'SUBSCRIBE', 'user' : user})
    };

    newTask._onmessage = function(m) {
        var data = JSON.parse(m.data);

        switch (data.type) {

        case 'TASKDESC':

            if (!$('#processcontainer' + data.processid).length) {
                // create new tab for new process
                $('#taskstable').append(
                    '<li role="presentation"><a data-toggle="tab" href="#processcontainer' +
                        data.processid + '">Process ' +
                        data.processid +
                        '</a></li>'
                );
                var tasksDiv = $('#tasks');
                var processDiv = document.createElement('div');
                processDiv.id = 'processcontainer' + data.processid;
                processDiv.className = 'tab-pane';
                tasksDiv.append(processDiv);

                // check if it is the first tab
                // (in this case we make it open by default)
                if ($('#taskstable li').length == 1) {
                    $('#taskstable li a:first').tab('show');
                }

            }

            var processDiv = $('#processcontainer' + data.processid);
            var taskDiv = document.createElement('div');
            taskDiv.id = 'taskcontainer' + taskid;
            taskDiv.innerHTML = '<p id="taskdata' + taskid +
                '"></p><div id="taskFormDiv' + taskid + '"></div><hr>';
            processDiv.append(taskDiv);

            $('#taskdata' + taskid).html(data.description);

            // yes `this` is the websocket in this context... js FTW!
            var ws = this;
            taskFormGenerate(
                taskid,
                data,
                'taskFormDiv' + taskid,
                'taskForm' + taskid,
                function(values) {
                    newTask.send({'type': 'SUBMIT', 'values': values});
                    $('#taskForm' + taskid).html('');
                }
            );

            $('html, body').animate({
                scrollTop: ($('#taskdata' + taskid).offset().top - 70)
            }, 'fast');
            break;

        case 'VALIDATED':
            $('#tasknotif' + taskid).remove();
            taskDiv = $('#taskdata' + taskid).after(
                '<div id="tasknotif' +
                    taskid +
                    '" class="alert alert-success" role="alert">Great, your submission matched an expected answer.</div>'
            );
            break;

        case 'OTHER_VALIDATED':
            $('#tasknotif' + taskid).remove();
            taskDiv = $('#taskdata' + taskid).after(
                '<div id="tasknotif' +
                    taskid +
                    '" class="alert alert-info" role="alert">Another user completed the task</div>'
            );
            break;

        case 'RESUBMIT':
            $('#tasknotif' + taskid).remove();
            taskDiv = $('#taskdata' + taskid).after(
                '<div id="tasknotif' +
                    taskid +
                    '" class="alert alert-danger" role="alert">Sorry, your submission did not match expected answer(s). Please try again.</div>'
            );

            var ws = this;
            taskFormGenerate(
                taskid,
                data,
                'taskFormDiv' + taskid,
                'taskForm' + taskid,
                function(values) {
                    newTask.send({'type': 'SUBMIT', 'values': values});
                    $('#taskFormDiv' + taskid).html('');
                }
            );
            $('html, body').scrollTop($('#tasknotif' + taskid).offset().top - 70);
            break;

        case 'ERROR':
            $('#tasknotif' + taskid).remove();
            taskDiv = $('#taskdata' + taskid).after(
                '<div id="tasknotif' +
                    taskid +
                    '" class="alert alert-warning" role="alert">Hum... something weird happened, sorry about that</div>'
            );
            break;

        }
    };

    newTask._onclose = function(m) {
        if (this.closeOnError) {
            alert('The following error occurred: ' +
                  m.reason +
                  ' (' + m.code + ')'
                 );
        }
    };

    newTask._onerror = function(e) {
        closeOnError = true;
    };

    return newTask;
}
