;(function(global ,undefined){
    var index = 0
    global.nextTick = global.requestAnimationFrame || function(fn , ttl){
        global.setTimeout(fn , ttl || 0)
    }
    global.uuid = function(pre , len){
        var uid = (+new Date).toString(36) 
        if (len) return uid.slice( -len)
        return (pre || '') + uid + '_' + ++index 
    }
    function _detectType(obj , type){
        return Object.prototype.toString.call(obj) == "[object "+type+"]";
    }

    var util = global.util = {
        uuid : uuid
		,build_query : function(obj){
			if (_detectType(obj , 'String')) return obj
			var ret = []
			for (var name in obj){
				obj[name] !== '' && ret.push(encodeURIComponent(name) + '=' + encodeURIComponent(obj[name]))
			}
			return ret.join('&')
		}
		,extend : function(){
			var a,b
			function _ext(m ,n){
				for(var k in n){
					m[k] = n[k]
				}
			}
			util.toArray(arguments ).forEach(function(i){
				b = i
				if (!_detectType(i , 'Object')) return
				if (!a) a = i
				else _ext(a,i)
			})
			return a || b
		}
		,report : function(){
			console && console.log &&  console.log.apply(console , arguments)
		}
		,reportErr : function(){
			console && console.error &&  console.error.apply(console , arguments)
		}
		,nextTick : nextTick
		,toArray : function(colletions ,offset){
			return Array.prototype.slice.call(colletions , offset || 0) 
		}
		,isArray : function(obj){
			return _detectType(obj , 'Array')
		}
		,detectType : function(obj , M){
			return _detectType(obj , M)
		}
		,throttle : function throttle(fn ,delay){
			var timer = null	
			delay = delay || 10
			return function(){
				var context = this, args = arguments
				clearTimeout(timer)
				timer = setTimeout(function(){
					fn.apply(context, args)
				}, delay)
			}
		}
        ,debounce : function debounce(func, wait, immediate){
			var timeout, result;
            return function() {
                var context = this,
                    args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) result = func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) result = func.apply(context, args);
                return result;
            };
		}
    }

    var head = document.head  || document.getElementsByTagName('head')[0] || document.documentElement
    global.loadJS = function(src , opt){
        opt = opt || {}
        var l = document.createElement('script')
        l.type = 'text/javascript'
		l.charset = "UTF-8" 
        l.src =  src
        if (opt.onErr) l.onerror = opt.onErr 
        if (opt.onLoad) l.onload = opt.onLoad 
        head.appendChild(l)
        return l
    }

    global.loadCSS = function(css){
        var l = document.createElement('link')
        l.setAttribute('rel','stylesheet')
        l.setAttribute('href',css)
        head.appendChild(l)
		return l
    }

})(this)


;(function(global ,undefined){
    var evts = {}
        ,onceTag = '__event_once'
    function emit(event ){
        var args = util.toArray(arguments , 1)
        if (!(event in evts)) return
        var _dels = []
        for (var i = 0 , j = evts[event].length ; i < j ;i ++){
            var cbk = evts[event][i]
            if (!cbk) return
            cbk.apply(null , args)
            if (cbk[onceTag])  { 
                evts[event][i] = null 
                _dels.push(i)
            } 
        }
        for (var i = _dels.length -1 ; i>=0 ; i--) evts[event].splice(_dels[i] , 1)
    }

    function addMultiCon(event , listener){
        var once = true
        event.sort()
        addListener(event.join('|') , listener , once)
        var eventBubbles = []
            ,ret = {}
        function tinOpener(evt){
            eventBubbles.push(evt)

            if (arguments.length > 2)
                ret[evt] = util.toArray(arguments , 1)
            else
                ret[evt] = arguments[1] 

            if (eventBubbles.length >=  event.length) {
                eventBubbles.sort()
                emit(eventBubbles.join('|') , ret)
            }
        } 

        for (var i = 0 ; i < event.length;i ++){
            addListener(event[i] , tinOpener.bind(null, event[i]) , once)
        }
    }

    function addListener(event , listener , once){
        if (util.isArray(event)) return addMultiCon(event , listener)


        if (!(event in evts)) evts[event] = []
        if (once) listener[onceTag] = true
        evts[event].push(listener)
    }

    function removeListener(event, listener){
        if (!listener) {
            delete evts[event]
            return
        }
        for (var i = evts[event].length -1 ; i >= 0 ;i --){
            if (evts[event][i] === listener) {  evts[event].splice(i, 1) ; break}
        }
    }

    function listeners(event){
        return evts[event]
    }
    global.emitter = {
        on : addListener
        ,once : function(event , listener){
                addListener(event , listener , true)
                } 
        ,emit : emit
        ,removeListener : removeListener
        ,listeners : listeners
    }
})(this)


;(function(global ,undefined){
    var mods = {}
		,asyncLoading = []
		,depTree = {}
		,markHardDefine = {}
        ,modDefining = {}
        ,inteligent = {}
        ,requireRef = {}
        ,bootOpt = {"serverHost" : "/~" 
                    ,"ENV" : "PRODUCT" // 'DEV' 'PRODUCT'
                    }

    function require(mod , callerMod ,ns){
        if (requireRef[mod]) return requireRef[mod]
        if (util.detectType(mod , 'Function')) {
            mod = inteligent[mod] 
        }

        if (mod){
            mod = trnName(mod , callerMod)
        }
		var modNS = mod
        if (ns) modNS += '@' + ns
        if (! isModLoaded(mod ,ns) ) {
			if (!bootOpt.hardDefining){
				throw mod + '@' + ns + ' lost'
			}else{
				mods[modNS] = {}
			}
		}
        return mods[modNS]
    }

    function trnName(name , callerMod){
        if (callerMod) {
            var spath = name.split('/')
            if ('.' == spath[0]) spath[0] = callerMod.split('/')[0]
            var apath = []
            spath.forEach(function(path_item){
                if (!path_item || '.' == path_item) return 
                if ('..' == path_item) apath.pop()      
                else apath.push(path_item)
            })  
            //if (1 == apath.length) apath.push('index')
            name = apath.join('/')
        }

        //if (-1 == name.indexOf('/') ) name += '/.index'
        return name
        ///return name.replace(/\//g,'::')
    }
    var DEFINESTAT = {'DEFINING' : 1 ,'ASYNCLOAD' : 2 ,'DEFINED':3}
	var STORAGE = 'localStorage' in window ? window.localStorage : null
	/*
	* 忽略依赖 强制define
	*/
	function hardDefine(){
		bootOpt.hardDefining = true
		Object.keys(depTree).forEach(function(modOrign){
			define(modOrign,[] , depTree[modOrign])
		})
		delete bootOpt.hardDefining
		markHardDefine = {}
		depTree = {} 
	}
    function define(modOrign , depencies , con ,opt){
		if (!con) return
        var mod = trnName(modOrign )
        var modNS = mod 
        var ns = define.ns
        if (ns) modNS += '@' + ns

        if (modNS in requireRef) return
		if (!bootOpt.hardDefining){
			if (modNS in mods) return
			depTree[modOrign] = con 
		}else {
			if(markHardDefine[modOrign]) return
			markHardDefine[modOrign] = true
		}

        modDefining[modNS] = DEFINESTAT.DEFINING 

        opt = opt || {}

        var toLoad = []
        for (var i = 0,j = depencies.length ; i <  j ; i++){
            var toDep = depencies[i]
            //智能加载
            if (util.detectType(toDep , 'Function')) {
                if (!inteligent[toDep] ) inteligent[toDep] = toDep()
                depencies[i] = inteligent[toDep] 
            }
            var dependName = trnName(depencies[i] , mod)
            if (! isModLoaded(dependName , ns)) toLoad.push(dependName)
        }
        if (toLoad.length){
            //跨组件返回的js可能需要的依赖在下面，这里trick下  先执行无依赖的 ，有依赖的延时执行
            if (!opt.defered) {
                //util.report(modOrign + " lack of some  depencies " , toLoad)
                nextTick(function(){
                    opt.defered = true
                    define(modOrign , depencies , con ,opt)         
                })
                return
            }


            if (opt.throwIfDepMiss) return emitter.emit(modNS + ':loadfail'  , {"message" : toLoad.join(',') + ' miss while loading ' + mod})

            //依赖失败的话会尝试异步拉取一次
            //已加载的模块不再拉了

			//如果在async_load列表里的也不要拉了
            var _on_evt_list = []
            for (var i = toLoad.length-1 ;i >= 0 ;i --){
                var _m = trnName(toLoad[i])
                if (ns) _m += '@' + ns
                _on_evt_list.push(_m + ':defined')
                if (modDefining[_m] || asyncLoading.indexOf(toLoad[i]) >=0) toLoad.splice(i,1) 
                else modDefining[_m] = DEFINESTAT.ASYNCLOAD 
            }

            emitter.on(_on_evt_list , function(){
				if (bootOpt.hardDefining && depTree[modOrign]) return
                define(modOrign , depencies , con)
            })
            if (toLoad.length) {
                loadMod(toLoad)
            }else if (bootOpt.enableHardDefine){
				nextTick(hardDefine)
			}
            return
        }
		delete depTree[modOrign]
        var exports = {}
            ,module = {exports : undefined}

        var ret = con(function(inMod){ return require(inMod , mod ,ns)}, exports , module) 
        if (undefined === module.exports) {
			mods[modNS] =  util.extend(mods[modNS] ,  exports) || ret
			//mods[modNS] =  exports || ret
		}else{
        	mods[modNS] = util.extend(mods[modNS] , module.exports)
		}
        modDefining[modNS] = DEFINESTAT.DEFINED 

        emitter.emit(modNS + ':defined')
		
    }

    function isModLoaded(mod , ns){
        var modNS = trnName(mod) 
        if (ns) modNS += '@' + ns
        return  (modNS in requireRef) || (modNS in mods)
    }

    function loadMod(mods , opt){
		opt = opt || {}
		opt.onErr = onErr
        if (! global.util.isArray(mods)) mods = [mods]
		//加版本号，前缀设置
		//TODO serverHost 失效时的fallback
		var version = bootOpt.Version 
		if ('auto' === version ) version = +new Date
		version = version ? '?v=' + version : ''

		hostNu = opt.hostNu || 0
		var serverHost = bootOpt.serverHost

		if (util.isArray(serverHost)) serverHost = serverHost[hostNu] 
		if (!serverHost) {
			throw '资源未配置'
			return
		}

		function onErr(){
			hostNu++
			if (!util.isArray(bootOpt.serverHost) || hostNu >= bootOpt.serverHost.length ) return console.error('资源拉取错误')
			loadMod(mods,{'hostNu' : hostNu})
		}
        if (bootOpt.ENV === 'DEV'){
            mods.forEach(function(m){
				if (!m || isModLoaded(m)) return
                loadJS(serverHost + m + '.js' + version ,opt) 
            })
		} else {
			var mods_combine = bootOpt.combine ?bootOpt.combine(mods) : mods.join('+') + '.js'
			if (!mods_combine) return
			loadJS(serverHost + mods_combine +  version,opt)
		}
    }

    global.booter = {
        "require" : require
        ,"define" : define
        ,"isModLoaded" : isModLoaded
        ,"option" : 
        function(opt ,optval){
            if (!opt) return  bootOpt
            if (undefined !== optval) {
				bootOpt[opt] = optval 
			}else if (util.detectType(opt,'Object')){
				for (var k in opt) bootOpt[k] = opt[k]
			}else{
				return bootOpt[opt]
			}
            return this
        } 
        ,"ref" : 
        function(mod , globalRef){
            requireRef[mod] = globalRef     
            return this    
        }
    }
	if (!global.define) global.define = global.booter.define
    
    function appendFix(obj , stuffix){
        var util = global.util
        if (util.isArray(obj)){
            obj = obj.map(function (item){
                return item + stuffix
            })
        } else if (util.detectType(obj,'String')){
            obj += stuffix
        }
        return obj
    }

    ~function(){
        var async_mod = []
			,async_css = []

        global.booter.asyncLoad = function(mod , cbk){
            function onLoad(){
                var inst 
                if (is_multi){
                    inst = {}
                    mod.forEach(function(m){
                        inst[m] = require(m)
                    })
                } else {
                    inst = require(mod)
                }
                cbk.call(inst)
            }

            var is_multi = global.util.isArray(mod)
            if (!is_multi) mod = [mod]     
			var need_load = []
			mod.forEach(function(m){
				if (!isModLoaded(m)) need_load.push(m)
			})
			if (0 === need_load.length) {
				return onLoad()
			}
            if (cbk) emitter.on(appendFix(mod , ':defined') , onLoad)

            need_load.forEach(function(m){
				if (async_mod.indexOf(m) === -1) async_mod.push(m)
            })

            //开发模式js加载器加载 ， 生产模式服务器打包加载	
			var asyncJSFn = util.throttle(function(){
				loadMod(async_mod ,{'onLoad' : function(){
					//加载完了 可以开启hardDefine
					if (false === bootOpt.enableHardDefine) return
					bootOpt.enableHardDefine = true

					async_mod = []
					async_css = []
				},'Version' : bootOpt.Version})
			} )
			if (async_mod.length) asyncJSFn() 
            return this
        }
    }()
})(this)
