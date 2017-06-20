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
            var _on_evt_list = []
            for (var i = toLoad.length-1 ;i >= 0 ;i --){
                var _m = trnName(toLoad[i])
                if (ns) _m += '@' + ns
                _on_evt_list.push(_m + ':defined')
                if (modDefining[_m]) toLoad.splice(i,1) 
                else modDefining[_m] = DEFINESTAT.ASYNCLOAD 
            }

            emitter.on(_on_evt_list , function(){
				if (bootOpt.hardDefining && depTree[modOrign]) return
                define(modOrign , depencies , con)
            })
            if (toLoad.length) {
                loadMod(toLoad)
            }else{
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
		!opt.fromLocal && emitter.emit(modOrign+ ':tocache' , con , depencies)
		
    }

    function isModLoaded(mod , ns){
        var modNS = trnName(mod) 
        if (ns) modNS += '@' + ns
        return  (modNS in requireRef) || (modNS in mods)
    }

    function loadMod(mods , opt){
		opt = opt || {}
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
                loadJS(serverHost + m + '.js' + version ,{'onErr' : onErr}) 
            })
		} else {
			var mods_combine = bootOpt.combine ?bootOpt.combine(mods) : mods.join('+') + '.js'
			if (!mods_combine) return
			loadJS(serverHost + mods_combine +  version,{'onErr' : onErr})
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
			}else{
				for (var k in opt) bootOpt[k] = opt[k]
			}
			if (bootOpt.localCache && !STORAGE){
				bootOpt.localCache = false
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
            ,async_timer



        global.booter.asyncLoad = function(mod , cbk){
			var new_mods
			if (bootOpt.localCache && bootOpt.modsNVersion){
				//bootOpt.modVersions 里的都需要使用，先跟本地比对然后重写列表	
				//长期不用的缓存理掉
				//缓存格式 md5;依赖列表 逗号分割;脚本内容
				~function(){
					var LOCALKEY = '_cjs_'
						,LOCAL_MODS_ACTIVE_KEY = '_cjs_a_'
						,LOCAL_MODS_KEY = '_cjs_lt_'

					//缓存开始时间
					var ERA = 1493740800000
						,RECYCLE_TTL = 4000 //4秒后执行清理
						,STORE_TTL = 2000 //2秒后再写入缓存
					function getStoredKey(k){
						return LOCALKEY + getModKey(k)
					}
					
					new_mods = []


					var all_mods = getItem(LOCAL_MODS_KEY)
						,should_update_list = false

					all_mods = all_mods? all_mods.split(',') : []

					var mods_active = getItem(LOCAL_MODS_ACTIVE_KEY)
						,should_update_stamp = false
					mods_active = mods_active? mods_active.split(',') :[]
				

					function  StrGen(con,splitor){
						var splitor_len = splitor.length
						return {
							'next' : function(){
								var index = con.indexOf(splitor)
								if (index > -1){
									var ret = con.slice(0,index)
									con = con.slice(index + splitor_len)
									return ret
								}
							}
							,'return': function(){
								return con
							}
						}
					}

					function getModKey(m){
						var index  = all_mods.indexOf(m)
						if (index === -1) {
							should_update_list = true
							index = all_mods.push(m) - 1
							tryUpModList()
						}
						return index
					}
					function getKeyMod(index){
						return all_mods[index] 
					
					}

					function unzip(depencies){
						return depencies.map(getKeyMod)
					} 
					function zip(depencies){
						return depencies.map(getModKey)
					}
					function setItem(key,val){
						try{
							if (bootOpt.localCache.decompress) val = bootOpt.localCache.compress(val)
							STORAGE.setItem(key , val)
						}catch(err){
							console.log('update js list error ' ,error)
						}
					}
					function getItem(key){
						var val = STORAGE.getItem(key)
						if (bootOpt.localCache.decompress) val = bootOpt.localCache.decompress(val)
						return val
					}
					function getCacheStamp(){
						//过去的分钟数
						return (new Date - ERA)/1000/60|0
					}
					var tryUpModList = util.throttle(function(){
						if (!should_update_list) return
						setItem(LOCAL_MODS_KEY, all_mods.join(','))
					})
					var tryUpActiveStamp = util.throttle(function(){
						if (!should_update_stamp) return
						setItem(LOCAL_MODS_ACTIVE_KEY, mods_active.join(','))
					},500)
					function updateModActiveTime(mode , ttl){
						mods_active[getModKey(m)] = ttl
						should_update_stamp = true
						tryUpActiveStamp()
					}

					for(var  m in bootOpt.modsNVersion){
						var lastest_version = bootOpt.modsNVersion[m]
						//模块不存在时 lastest_version 为空 不缓存
						var store_key = getStoredKey(m)
						var _cached = getItem(store_key)
						if (_cached){

							var local_version = _cached.slice(0,32)
							if (local_version === lastest_version){
								_cached = StrGen(_cached.slice(33) ,';')

								var depencies = _cached.next()
									,fn = _cached.return() 

								depencies = depencies ? unzip(depencies.split(',')) : []
								try{
									define(m , depencies ,new Function("return function (require ,exports ,module){" + fn + "}")() ,{'fromLocal' : true})
									updateModActiveTime(m ,getCacheStamp())
								}catch(err){
									//依赖列表错误时这里会报错
									console.log(err)
									//删除缓存并异步拉取
									localStorage.removeItem(store_key)
									booter.asyncLoad(m)
								}

								continue
							}
						}


						new_mods.push(m)

						var _store_delay_i = 0 
						emitter.on(m + ':tocache',function(store_key ,lastest_version){
							return function(fn , depencies){
								if (!lastest_version || !store_key) return
								window.setTimeout(function(){
									var fn_str = fn.toString()
									fn_str = fn_str.slice(fn_str.indexOf('{') + 1 , -1).trim()
									//function (require ,exports ,module){
									var _cache = [lastest_version , zip(depencies).join(',') ,  fn_str].join(';')
									setItem(store_key , _cache)
								}, STORE_TTL + (_store_delay_i++) * 10)
							}
						}(store_key,lastest_version))
					}
					
					//删除长期未激活的缓存
					//单位分钟
					function removeUnActives(expires){
						var now = getCacheStamp() 
						mods_active.forEach(function(active_time,i){
							active_time = active_time | 0
							if (active_time + expires >= now) return
							var mod = getKeyMod(i)
								,store_key = getStoredKey(mod)
							localStorage.removeItem(store_key)
							updateModActiveTime(mod ,0)
						})
					}

					if (bootOpt.localCache.expires && mods_active){
						setTimeout(function(){
							removeUnActives(bootOpt.localCache.expires)
						},RECYCLE_TTL)
					}		
				}()
				
				
			}
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
            } else {
                mod = need_load
            }

            if (cbk) emitter.on(appendFix(mod , ':defined') , onLoad)

            ;(new_mods || mod).forEach(function(m){
                if (async_mod.indexOf(m) === -1) async_mod.push(m)
            })

            //开发模式js加载器加载 ， 生产模式服务器打包加载
			if (!async_mod.length) return
            async_timer && global.clearTimeout(async_timer)
            async_timer = global.setTimeout(function(){
                            loadMod(async_mod)
                        } , 0)
            return this
        }
    }()
})(this)
