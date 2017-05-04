# booter.js
AMD模块加载器，支持异步加载，合并加载，本地缓存增量更新

1. 
	booter.define(模块名,[依赖列表],function(require, exports ,module){
		...	
	})


2. 
	booter.asyncLoad('模块a' ,function(){
		console.log(this)
	})
	booter.asyncLoad('模块a','模块b' ,function(){
		console.log(this,模块a)
	})

3. 
	booter.option({
		"localCache" : true,
		"modsNVersion" : {模块a: 版本号} 
	})
	//如果有本地版本就本地加载
	booter.asyncLoad('模块a' ,function(){
		console.log(this)
	})

