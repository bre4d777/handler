export class Rei {
	constructor(max = 50000) {
		this.$ = new Map();
		this.max = max;
	}

	set(k, v) {
		const m = this.$;
		if (m.size >= this.max && !m.has(k)) {
			const first = m.keys().next().value;
			m.delete(first);
		}
		m.set(k, v);
		return this;
	}

	get(k) {
		return this.$.get(k);
	}

	has(k) {
		return this.$.has(k);
	}

	del(k) {
		return this.$.delete(k);
	}

	delete(k) {
		return this.$.delete(k);
	}

	clear() {
		this.$.clear();
		return this;
	}

	peek(k) {
		return this.$.get(k);
	}

	mset(arr) {
		const m = this.$;
		const len = arr.length;
		for (let i = 0; i < len; i++) {
			m.set(arr[i][0], arr[i][1]);
		}
		return this;
	}

	setMany(arr) {
		return this.mset(arr);
	}

	mget(keys) {
		const m = this.$;
		const len = keys.length;
		const out = new Array(len);
		for (let i = 0; i < len; i++) {
			out[i] = m.get(keys[i]);
		}
		return out;
	}

	getMany(keys) {
		return this.mget(keys);
	}

	mdel(keys) {
		const m = this.$;
		const len = keys.length;
		for (let i = 0; i < len; i++) {
			m.delete(keys[i]);
		}
		return this;
	}

	deleteMany(keys) {
		return this.mdel(keys);
	}

	exists(k) {
		return this.$.has(k);
	}

	peekHas(k) {
		return this.$.has(k);
	}

	getOr(k, d) {
		const v = this.$.get(k);
		return v === undefined ? d : v;
	}

	setnx(k, v) {
		const m = this.$;
		if (!m.has(k)) {
			m.set(k, v);
			return 1;
		}
		return 0;
	}

	setNX(k, v) {
		const m = this.$;
		if (!m.has(k)) {
			m.set(k, v);
			return true;
		}
		return false;
	}

	incr(k, d = 1) {
		const m = this.$;
		const v = m.get(k);
		if (v === undefined) {
			m.set(k, d);
			return d;
		}
		const n = (v | 0) + d;
		m.set(k, n);
		return n;
	}

	incrby(k, d) {
		return this.incr(k, d);
	}

	decr(k, d = 1) {
		return this.incr(k, -d);
	}

	decrby(k, d) {
		return this.incr(k, -d);
	}

	pop(k) {
		const m = this.$;
		const v = m.get(k);
		if (v !== undefined) m.delete(k);
		return v;
	}

	keys(pattern) {
		const m = this.$;
		if (!pattern || pattern === '*') {
			return Array.from(m.keys());
		}
		const regex = new RegExp(pattern.replace(/\*/g, '.*'));
		const matches = [];
		for (const k of m.keys()) {
			if (regex.test(k)) matches.push(k);
		}
		return matches;
	}

	values() {
		return Array.from(this.$.values());
	}

	entries() {
		return Array.from(this.$.entries());
	}

	hset(k, f, v) {
		const m = this.$;
		let h = m.get(k);
		if (!h || typeof h !== 'object' || Array.isArray(h) || h instanceof Set) {
			h = {};
			m.set(k, h);
		}
		h[f] = v;
		return this;
	}

	hget(k, f) {
		const h = this.$.get(k);
		return h && typeof h === 'object' && !Array.isArray(h) && !(h instanceof Set)
			? h[f]
			: undefined;
	}

	hdel(k, f) {
		const h = this.$.get(k);
		if (h && typeof h === 'object' && !Array.isArray(h) && !(h instanceof Set)) {
			delete h[f];
			return true;
		}
		return false;
	}

	hgetall(k) {
		const h = this.$.get(k);
		return h && typeof h === 'object' && !Array.isArray(h) && !(h instanceof Set)
			? h
			: {};
	}

	hmset(k, obj) {
		const m = this.$;
		let h = m.get(k);
		if (!h || typeof h !== 'object' || Array.isArray(h) || h instanceof Set) {
			h = {};
			m.set(k, h);
		}
		Object.assign(h, obj);
		return this;
	}

	hmget(k, fields) {
		const h = this.$.get(k);
		if (!h || typeof h !== 'object' || Array.isArray(h) || h instanceof Set) {
			return fields.map(() => undefined);
		}
		const len = fields.length;
		const out = new Array(len);
		for (let i = 0; i < len; i++) {
			out[i] = h[fields[i]];
		}
		return out;
	}

	hincrby(k, f, d = 1) {
		const m = this.$;
		let h = m.get(k);
		if (!h || typeof h !== 'object' || Array.isArray(h) || h instanceof Set) {
			h = {};
			m.set(k, h);
		}
		const v = h[f];
		const n = (v === undefined ? 0 : v | 0) + d;
		h[f] = n;
		return n;
	}

	sadd(k, ...members) {
		const m = this.$;
		let s = m.get(k);
		if (!s || !(s instanceof Set)) {
			s = new Set();
			m.set(k, s);
		}
		const len = members.length;
		for (let i = 0; i < len; i++) {
			s.add(members[i]);
		}
		return this;
	}

	smembers(k) {
		const s = this.$.get(k);
		return s instanceof Set ? Array.from(s) : [];
	}

	sismember(k, m) {
		const s = this.$.get(k);
		return s instanceof Set ? s.has(m) : false;
	}

	srem(k, ...members) {
		const s = this.$.get(k);
		if (s instanceof Set) {
			const len = members.length;
			for (let i = 0; i < len; i++) {
				s.delete(members[i]);
			}
		}
		return this;
	}

	lpush(k, ...values) {
		const m = this.$;
		let arr = m.get(k);
		if (!Array.isArray(arr)) {
			arr = [];
			m.set(k, arr);
		}
		arr.unshift(...values);
		return arr.length;
	}

	rpush(k, ...values) {
		const m = this.$;
		let arr = m.get(k);
		if (!Array.isArray(arr)) {
			arr = [];
			m.set(k, arr);
		}
		arr.push(...values);
		return arr.length;
	}

	lpop(k) {
		const arr = this.$.get(k);
		return Array.isArray(arr) ? arr.shift() : undefined;
	}

	rpop(k) {
		const arr = this.$.get(k);
		return Array.isArray(arr) ? arr.pop() : undefined;
	}

	lrange(k, start, stop) {
		const arr = this.$.get(k);
		if (!Array.isArray(arr)) return [];
		const end = stop === -1 ? arr.length : stop + 1;
		return arr.slice(start, end);
	}

	llen(k) {
		const arr = this.$.get(k);
		return Array.isArray(arr) ? arr.length : 0;
	}

	get size() {
		return this.$.size;
	}

	get length() {
		return this.$.size;
	}

	dbsize() {
		return this.$.size;
	}

	flushdb() {
		this.$.clear();
		return this;
	}

	flushall() {
		this.$.clear();
		return this;
	}
}

export class ReiT extends Rei {
	constructor(max = 5000) {
		super(max);
		this.ttl = new Map();
		this.intervals = new Map();
	}

	set(k, v, ttl) {
		super.set(k, v);
		if (ttl) {
			this.expire(k, ttl);
		}
		return this;
	}

	expire(k, seconds) {
		const existing = this.intervals.get(k);
		if (existing) clearTimeout(existing);

		const timeout = setTimeout(() => {
			this.$.delete(k);
			this.ttl.delete(k);
			this.intervals.delete(k);
		}, seconds * 1000);

		this.intervals.set(k, timeout);
		this.ttl.set(k, Date.now() + seconds * 1000);
		return this;
	}

	ttl(k) {
		const expiry = this.ttl.get(k);
		if (!expiry) return -1;
		const remaining = Math.ceil((expiry - Date.now()) / 1000);
		return remaining > 0 ? remaining : -2;
	}

	clear() {
		for (const timeout of this.intervals.values()) {
			clearTimeout(timeout);
		}
		this.intervals.clear();
		this.ttl.clear();
		super.clear();
		return this;
	}

	del(k) {
		const timeout = this.intervals.get(k);
		if (timeout) {
			clearTimeout(timeout);
			this.intervals.delete(k);
		}
		this.ttl.delete(k);
		return super.del(k);
	}

	delete(k) {
		return this.del(k);
	}
}
