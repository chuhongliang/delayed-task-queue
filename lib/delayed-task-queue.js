
const EventEmitter = require('events').EventEmitter;
const INIT_ID = 0;
const EVENT_CLOSED = 'closed';
const EVENT_DRAINED = 'drained';

const STATUS_IDLE = 0;
const STATUS_BUSY = 1;
const STATUS_CLOSED = 2;
const STATUS_DRAINED = 3;

class DelayedTaskQueue extends EventEmitter {
	constructor() {
		super();
		EventEmitter.call(this);
		this.status = STATUS_IDLE;
		this.queue = [];
		this.curId = INIT_ID;
		this.timeout = 2000;
	}

	push(fn, delayedTime) {
		const self = this;
		if (self.status !== STATUS_IDLE && this.status !== STATUS_BUSY)
			return false;
		if (typeof fn !== 'function') {
			throw new Error('func should be a function.');
		}
		this.queue.push({ fn, delayedTime });
		if (this.status === STATUS_BUSY) return true;
		if (this.status === STATUS_IDLE) {
			this.status = STATUS_BUSY;
			process.nextTick(function () {
				self._next(self.curId);
			})
		}
		return true;
	}

	_next(taskId) {
		const self = this;
		if (taskId !== this.curId) return;
		if (this.status !== STATUS_BUSY && this.status !== STATUS_CLOSED) return;

		if (self.timeOutTimerId) {
			clearTimeout(self.timeOutTimerId);
			self.timeOutTimerId = undefined;
		}
		if (self.timerId) {
			clearTimeout(self.timerId);
			self.timerId = undefined;
		}

		let task = this.queue.shift();
		if (!task) {
			if (this.status === STATUS_BUSY) {
				this.status = STATUS_IDLE;
				this.currentId++;
				return;
			}
			this.status = STATUS_DRAINED;
			this.emit(EVENT_DRAINED);
			return;
		}

		task.id = ++this.curId;
		this.timeOutTimerId = setTimeout(function () {
			self.status = STATUS_BUSY;
			if (self.timerId) {
				clearTimeout(self.timerId);
				self.timerId = undefined;
			}
			process.nextTick(function () {
				self._next(task.id);
			});
		}, self.timeout + task.delayedTime);

		this.timerId = setTimeout(function () {
			try {
				task.fn({
					done: function () {
						let res = task.id === this.currentId;
						self.status = STATUS_BUSY;
						if (self.timeOutTimerId) {
							clearTimeout(self.timeOutTimerId);
							self.timeOutTimerId = undefined;
						}
						process.nextTick(function () {
							self._next(task.id);
						})
						return res;
					}
				})
			} catch (err) {
				self.emit('err', err, task);
				process.nextTick(function () {
					self._next(task.id);
				})
			}

		}, task.delayedTime);
	}

	close(force) {
		if (this.status !== STATUS_IDLE && this.status !== STATUS_BUSY)
			return;
		if (force) {
			this.status = STATUS_DRAINED;
			if (this.timerId) {
				clearTimeout(this.timerId);
				this.timerId = undefined;
			}
			if(this.timeOutTimerId){
				clearTimeout(this.timeOutTimerId);
				this.timeOutTimerId = undefined;
			}
			this.emit(EVENT_DRAINED);
		} else {
			this.status = STATUS_CLOSED;
			this.emit(EVENT_CLOSED);
		}
	}

}
module.exports = DelayedTaskQueue;