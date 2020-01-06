const DelayedTaskQueue = require('../lib/delayed-task-queue');
const queue = new DelayedTaskQueue();

queue.push(
	function(task){
		console.log('task1 doing');
		setTimeout(function(){
			console.log('task1 done');
			task.done();
		},1000);
	},
	500
)

queue.push(
	function(task){
		console.log('task2');
		task.done();
	},
	500
)

queue.push(
	function(task){
		console.log('task3');
		task.done();
	},
	500
)