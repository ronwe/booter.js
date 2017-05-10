~function(){
	// LZ-based compression algorithm, version 1.4.4
	var LZString = (function() {

		// private property
		var f = String.fromCharCode;
		var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
		var baseReverseDic = {};

		function getBaseValue(alphabet, character) {
			if (!baseReverseDic[alphabet]) {
				baseReverseDic[alphabet] = {};
				for (var i=0 ; i<alphabet.length ; i++) {
					baseReverseDic[alphabet][alphabet.charAt(i)] = i;
				}
			}
			return baseReverseDic[alphabet][character];
		}

		var LZString = {

			compressToUTF16 : function (input) {
				if (input == null) return "";
				return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
			},

			decompressFromUTF16: function (compressed) {
				if (compressed == null) return "";
				if (compressed == "") return null;
				return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
			},

			compress: function (uncompressed) {
				return LZString._compress(uncompressed, 16, function(a){return f(a);});
			},
			_compress: function (uncompressed, bitsPerChar, getCharFromInt) {
				if (uncompressed == null) return "";
				var i, value,
					context_dictionary= {},
					context_dictionaryToCreate= {},
					context_c="",
					context_wc="",
					context_w="",
					context_enlargeIn= 2, // Compensate for the first entry which should not count
					context_dictSize= 3,
					context_numBits= 2,
					context_data=[],
					context_data_val=0,
					context_data_position=0,
					ii;

					for (ii = 0; ii < uncompressed.length; ii += 1) {
						context_c = uncompressed.charAt(ii);
						if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
							context_dictionary[context_c] = context_dictSize++;
							context_dictionaryToCreate[context_c] = true;
						}

						context_wc = context_w + context_c;
						if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
							context_w = context_wc;
						} else {
							if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
								if (context_w.charCodeAt(0)<256) {
									for (i=0 ; i<context_numBits ; i++) {
										context_data_val = (context_data_val << 1);
										if (context_data_position == bitsPerChar-1) {
											context_data_position = 0;
											context_data.push(getCharFromInt(context_data_val));
											context_data_val = 0;
										} else {
											context_data_position++;
										}
									}
									value = context_w.charCodeAt(0);
									for (i=0 ; i<8 ; i++) {
										context_data_val = (context_data_val << 1) | (value&1);
										if (context_data_position == bitsPerChar-1) {
											context_data_position = 0;
											context_data.push(getCharFromInt(context_data_val));
											context_data_val = 0;
										} else {
											context_data_position++;
										}
										value = value >> 1;
									}
								} else {
									value = 1;
									for (i=0 ; i<context_numBits ; i++) {
										context_data_val = (context_data_val << 1) | value;
										if (context_data_position ==bitsPerChar-1) {
											context_data_position = 0;
											context_data.push(getCharFromInt(context_data_val));
											context_data_val = 0;
										} else {
											context_data_position++;
										}
										value = 0;
									}
									value = context_w.charCodeAt(0);
									for (i=0 ; i<16 ; i++) {
										context_data_val = (context_data_val << 1) | (value&1);
										if (context_data_position == bitsPerChar-1) {
											context_data_position = 0;
											context_data.push(getCharFromInt(context_data_val));
											context_data_val = 0;
										} else {
											context_data_position++;
										}
										value = value >> 1;
									}
								}
								context_enlargeIn--;
								if (context_enlargeIn == 0) {
									context_enlargeIn = Math.pow(2, context_numBits);
									context_numBits++;
								}
								delete context_dictionaryToCreate[context_w];
							} else {
								value = context_dictionary[context_w];
								for (i=0 ; i<context_numBits ; i++) {
									context_data_val = (context_data_val << 1) | (value&1);
									if (context_data_position == bitsPerChar-1) {
										context_data_position = 0;
										context_data.push(getCharFromInt(context_data_val));
										context_data_val = 0;
									} else {
										context_data_position++;
									}
									value = value >> 1;
								}


							}
							context_enlargeIn--;
							if (context_enlargeIn == 0) {
								context_enlargeIn = Math.pow(2, context_numBits);
								context_numBits++;
							}
							// Add wc to the dictionary.
							context_dictionary[context_wc] = context_dictSize++;
							context_w = String(context_c);
						}
					}

					// Output the code for w.
					if (context_w !== "") {
						if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
							if (context_w.charCodeAt(0)<256) {
								for (i=0 ; i<context_numBits ; i++) {
									context_data_val = (context_data_val << 1);
									if (context_data_position == bitsPerChar-1) {
										context_data_position = 0;
										context_data.push(getCharFromInt(context_data_val));
										context_data_val = 0;
									} else {
										context_data_position++;
									}
								}
								value = context_w.charCodeAt(0);
								for (i=0 ; i<8 ; i++) {
									context_data_val = (context_data_val << 1) | (value&1);
									if (context_data_position == bitsPerChar-1) {
										context_data_position = 0;
										context_data.push(getCharFromInt(context_data_val));
										context_data_val = 0;
									} else {
										context_data_position++;
									}
									value = value >> 1;
								}
							} else {
								value = 1;
								for (i=0 ; i<context_numBits ; i++) {
									context_data_val = (context_data_val << 1) | value;
									if (context_data_position == bitsPerChar-1) {
										context_data_position = 0;
										context_data.push(getCharFromInt(context_data_val));
										context_data_val = 0;
									} else {
										context_data_position++;
									}
									value = 0;
								}
								value = context_w.charCodeAt(0);
								for (i=0 ; i<16 ; i++) {
									context_data_val = (context_data_val << 1) | (value&1);
									if (context_data_position == bitsPerChar-1) {
										context_data_position = 0;
										context_data.push(getCharFromInt(context_data_val));
										context_data_val = 0;
									} else {
										context_data_position++;
									}
									value = value >> 1;
								}
							}
							context_enlargeIn--;
							if (context_enlargeIn == 0) {
								context_enlargeIn = Math.pow(2, context_numBits);
								context_numBits++;
							}
							delete context_dictionaryToCreate[context_w];
						} else {
							value = context_dictionary[context_w];
							for (i=0 ; i<context_numBits ; i++) {
								context_data_val = (context_data_val << 1) | (value&1);
								if (context_data_position == bitsPerChar-1) {
									context_data_position = 0;
									context_data.push(getCharFromInt(context_data_val));
									context_data_val = 0;
								} else {
									context_data_position++;
								}
								value = value >> 1;
							}


						}
						context_enlargeIn--;
						if (context_enlargeIn == 0) {
							context_enlargeIn = Math.pow(2, context_numBits);
							context_numBits++;
						}
					}

					// Mark the end of the stream
					value = 2;
					for (i=0 ; i<context_numBits ; i++) {
						context_data_val = (context_data_val << 1) | (value&1);
						if (context_data_position == bitsPerChar-1) {
							context_data_position = 0;
							context_data.push(getCharFromInt(context_data_val));
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = value >> 1;
					}

					// Flush the last char
					while (true) {
						context_data_val = (context_data_val << 1);
						if (context_data_position == bitsPerChar-1) {
							context_data.push(getCharFromInt(context_data_val));
							break;
						}
						else context_data_position++;
					}
					return context_data.join('');
			},

			decompress: function (compressed) {
				if (compressed == null) return "";
				if (compressed == "") return null;
				return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
			},

			_decompress: function (length, resetValue, getNextValue) {
				var dictionary = [],
				next,
				enlargeIn = 4,
				dictSize = 4,
				numBits = 3,
				entry = "",
				result = [],
				i,
				w,
				bits, resb, maxpower, power,
				c,
				data = {val:getNextValue(0), position:resetValue, index:1};

				for (i = 0; i < 3; i += 1) {
					dictionary[i] = i;
				}

				bits = 0;
				maxpower = Math.pow(2,2);
				power=1;
				while (power!=maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position == 0) {
						data.position = resetValue;
						data.val = getNextValue(data.index++);
					}
					bits |= (resb>0 ? 1 : 0) * power;
					power <<= 1;
				}

				switch (next = bits) {
					case 0:
						bits = 0;
						maxpower = Math.pow(2,8);
						power=1;
						while (power!=maxpower) {
							resb = data.val & data.position;
							data.position >>= 1;
							if (data.position == 0) {
								data.position = resetValue;
								data.val = getNextValue(data.index++);
							}
							bits |= (resb>0 ? 1 : 0) * power;
							power <<= 1;
						}
						c = f(bits);
						break;
					case 1:
						bits = 0;
						maxpower = Math.pow(2,16);
						power=1;
						while (power!=maxpower) {
							resb = data.val & data.position;
							data.position >>= 1;
							if (data.position == 0) {
								data.position = resetValue;
								data.val = getNextValue(data.index++);
							}
							bits |= (resb>0 ? 1 : 0) * power;
							power <<= 1;
						}
						c = f(bits);
						break;
					case 2:
						return "";
				}
				dictionary[3] = c;
				w = c;
				result.push(c);
				while (true) {
					if (data.index > length) {
						return "";
					}

					bits = 0;
					maxpower = Math.pow(2,numBits);
					power=1;
					while (power!=maxpower) {
						resb = data.val & data.position;
						data.position >>= 1;
						if (data.position == 0) {
							data.position = resetValue;
							data.val = getNextValue(data.index++);
						}
						bits |= (resb>0 ? 1 : 0) * power;
						power <<= 1;
					}

					switch (c = bits) {
						case 0:
							bits = 0;
							maxpower = Math.pow(2,8);
							power=1;
							while (power!=maxpower) {
								resb = data.val & data.position;
								data.position >>= 1;
								if (data.position == 0) {
									data.position = resetValue;
									data.val = getNextValue(data.index++);
								}
								bits |= (resb>0 ? 1 : 0) * power;
								power <<= 1;
							}

							dictionary[dictSize++] = f(bits);
							c = dictSize-1;
							enlargeIn--;
							break;
						case 1:
							bits = 0;
							maxpower = Math.pow(2,16);
							power=1;
							while (power!=maxpower) {
								resb = data.val & data.position;
								data.position >>= 1;
								if (data.position == 0) {
									data.position = resetValue;
									data.val = getNextValue(data.index++);
								}
								bits |= (resb>0 ? 1 : 0) * power;
								power <<= 1;
							}
							dictionary[dictSize++] = f(bits);
							c = dictSize-1;
							enlargeIn--;
							break;
						case 2:
							return result.join('');
					}

					if (enlargeIn == 0) {
						enlargeIn = Math.pow(2, numBits);
						numBits++;
					}

					if (dictionary[c]) {
						entry = dictionary[c];
					} else {
						if (c === dictSize) {
							entry = w + w.charAt(0);
						} else {
							return null;
						}
					}
					result.push(entry);

					// Add w+entry[0] to the dictionary.
					dictionary[dictSize++] = w + entry.charAt(0);
					enlargeIn--;

					w = entry;

					if (enlargeIn == 0) {
						enlargeIn = Math.pow(2, numBits);
						numBits++;
					}

				}
			}
		};
		return LZString;
	})();

	//类库加载
	//检查本地是否缓存了booter.js
	if (window.booter) return
	var LIB_KEY = '_cjs_l_'
		,LIB_URL = '/jslib/boot.min,/jslib/zepto.min.js'
		,LIB_VERSION = '1;'
	var STORAGE = 'localStorage' in window ? window.localStorage : null
	//从网络加载

	function  initOpt(){
		window.booter.option({
			"localCache" :{'compress': LZString.compressToUTF16,'decompress' : LZString.decompressFromUTF16,'expires' : 60 }
		})

	}
	function loadFromNet(){
		//暂存器
		var _can = []
		window.booter = {
			option :function(){ _can.push({'fn':'option','args':arguments }) }
			,asyncLoad :function(){_can.push({'fn':'asyncLoad','args':arguments })}
		}
		pullLib(LIB_URL ,function(lib_context){
			execute_code(lib_context)
			var booter = window.booter
			initOpt()
			for (var i=0,j=_can.length;i<j;i++){
				var _cmd = _can[i]
				booter[_cmd.fn].apply(null , _cmd.args)
			}
			_can = null
			try{
				STORAGE && STORAGE.setItem(LIB_KEY, LZString.compressToUTF16(LIB_VERSION + lib_context))
			}catch(err){
				//可能存满了 清空
				cleanCache()
			}
		})
	}
	function cleanCache(){
		if (!STORAGE) return
		for (var k in STORAGE){
			if (k.indexOf('_cjs_') === 0) {
				STORAGE.removeItem(k)
			}
		}
	}
	function execute_code(code){
		new Function("" ,code)()
	}
	function pullLib(lib_src,cbk){
		var xhr = new XMLHttpRequest()         
		xhr.onreadystatechange = function() {
			if(xhr.status == 200 && xhr.readyState == 4) {
				cbk(xhr.responseText)
			}
		}
		xhr.open("GET",lib_src,true)
		xhr.send(null)	

	}

	if (!STORAGE) return loadFromNet()
	var lib_context = STORAGE && STORAGE.getItem(LIB_KEY)
	if (!lib_context) return loadFromNet()
	lib_context = LZString.decompressFromUTF16(lib_context)
	if (!lib_context) return loadFromNet()

	if (lib_context.indexOf(LIB_VERSION) !== 0) return loadFromNet()

	lib_context = lib_context.slice(LIB_VERSION.length)

	execute_code(lib_context)
	initOpt()
}()
