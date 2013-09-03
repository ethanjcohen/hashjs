var Hash = (function()
{
	//image urls
	var loadingImageUrl = 'images/spinner.gif',
		refreshImageUrl = 'images/refresh_yellow.png';
		
	//hash param names
	var pageIDParam = 'p'; //the pageID
	
	//default options
	var enableHeaders = true, //options.headers
		enableRefresh = true, //options.refresh
		notificationsLimit = 3, //options.notificationsLimit
		startPageID = null, //options.startPage
		onChangeCallback = null,
		notificationPosition = 'top-right', //options.onChange
		moduleLoadingScreen = '<img height="10px" src="' + loadingImageUrl + '"/> Loading...';
		
	//internal variables
	var pages = null,
		activePageID = null,
		pageParams = null,
		contentBodySelector = null,
		pageContentCache = [],
		ignoreHashUpdate = false,
		isFocused = true,
		ignoreHashChange = false;
		
	//static class functions
	var Hash = {
		onChange : function()
		{
			log('hashchange, ignore:' + ignoreHashChange);
			if(ignoreHashChange)
				ignoreHashChange = false;
			else
			{
				pageParams = null;
				
				var pageID = Params.get(pageIDParam);
				if(pageID == null)
					pageID = startPageID;
					
				log('calling setup');
				Page.setup(pageID, true);
			}
		},
		setParams : function(paramsObj, mergeWithExistingParams)
		{
			mergeWithExistingParams = mergeWithExistingParams === true;
			var hash = this.getWindowHash();
			var params = hash == '' ? [] : hash.split("&");
			var newParams = paramsObj;
			var paramsOrder = [];
			
			var paramsArr = [];
			
			if(mergeWithExistingParams)
			{
				for(var paramIndex=0, paramCount=params.length; paramIndex<paramCount; paramIndex++)
				{
					var param = params[paramIndex];
					var eqIndex = param.indexOf("=");
					var hasValue = eqIndex != -1;
					if(hasValue)
					{
						var paramValue = param.substring(eqIndex+1);
						var paramName = param.substring(0, eqIndex);
					}
					else
					{
						var paramName = param;
						var paramValue = null;
					}	
					
					//need to keep the same hash order, so we'll just store the order for now
					paramsOrder.push(paramName);
					
					if(newParams[paramName] == null)
					{
						newParams[paramName] = paramValue;
					}
				}
				
				//use the order we discovered to add the params to the hash
				for(var paramIndex=0, paramCount=paramsOrder.length; paramIndex<paramCount; paramIndex++)
				{
					var paramName = paramsOrder[paramIndex];
					if(newParams[paramName] != '')
						paramsArr.push(paramName + '=' + newParams[paramName]);
					else
						paramsArr.push(paramName);
						
					delete newParams[paramName];
				}
				for(var paramName in newParams)
				{
					if(newParams[paramName] != '')
						paramsArr.push(paramName + '=' + newParams[paramName]);
					else
						paramsArr.push(paramName);
				}
			}
			else
			{
				for(var paramName in newParams)
				{
					if(newParams[paramName] != '')
						paramsArr.push(paramName + '=' + newParams[paramName]);
					else
						paramsArr.push(paramName);
				}
			}
			
			var updatedHash = paramsArr.join("&");
			if(window.location.hash != ('#'+updatedHash))
				ignoreHashChange = true;
				
			window.location.hash = updatedHash;
		},
		getWindowHash : function()
		{
			return window.location.hash.substring(1); //remove # prefix
		},
		clear : function()
		{
			window.location.hash = '';
		}
	};
	
	var PublicClasses = {
		Page : function(options)
		{
			this.id = options.id;
			this.title = options.title;
			this.items = options.items;
		},
		ModuleGrid : (function()
		{
			function ModuleGrid(options)
			{
				if(options == null)
					options = {};
				
				this._target = options.target;
				this._items = options.items == null ? [] : options.items;
			}
			
			ModuleGrid.prototype.getItems = function()
			{
				return this._items;
			}
			ModuleGrid.prototype.getTarget = function()
			{
				return this._target;
			}
			
			return ModuleGrid;
		}()),
		Module : (function()
		{
			function Module(options)
			{
				if(options == null)
					options = {};
					
				this._id = options.id;
				this._cls = options.cls == null ? [] : typeof options.cls == 'string' ? [options.cls] : options.cls;
				this._target = options.target == null ? null : options.target;
				this._title = options.title == null ? '' : options.title;
				this._loadingScreen = options.loadingScreen;
				this._isHeaderEnabled = options.header == null ? null : options.header;
				this._isHeaderRefreshEnabled = options.refresh == null ? null : options.refresh;
				this._flex = options.flex == null ? 1 : options.flex;
				this._contentUrl = options.contentUrl == null ? null : options.contentUrl;
				
				this.init = options.oninit == null ? function(pageParams, callback)
					{
						callback();
					} : options.oninit;
				this.display = options.ondisplay == null ? function(){} : options.ondisplay;
				this.error = options.onerror == null ? function(){} : options.onerror;
				this.destroy = options.ondestroy == null ? function(){} : options.ondestroy;
				this.refresh = options.onrefresh == null ? function(){} : options.onrefresh;
			}
			
			Module.prototype.getLoadingScreenContent = function()
			{
				var content = this._loadingScreen || moduleLoadingScreen;
				return $('<div class="moduleContainerContentLoadingScreen"></div>').append(content);
			}
			Module.prototype.isHeaderEnabled = function()
			{
				return this._isHeaderEnabled == null ? enableHeaders : this._isHeaderEnabled;
			}
			Module.prototype.isHeaderRefreshEnabled = function()
			{
				return this._isHeaderRefreshEnabled  == null ? enableRefresh : this._isHeaderRefreshEnabled;
			}
			Module.prototype.getID = function()
			{
				return this._id;
			}
			Module.prototype.getTitle = function()
			{
				return this._title;
			}
			Module.prototype.getClasses = function()
			{
				return this._cls;
			}
			Module.prototype.getTarget = function()
			{
				return this._target;
			}
			Module.prototype.getFlex = function()
			{
				return this._flex;
			}
			Module.prototype.getContentUrl = function()
			{
				return this._contentUrl;
			}
			
			return Module;
		}())
	}
	
	var Params = {
		clearAll : function()
		{
			Hash.clear();
			pageParams = null;
		},
		getAll : function()
		{
			var hash = Hash.getWindowHash();
			var params = hash.split("&");
			var pageParams = {};
			for(var paramIndex=0, paramCount=params.length; paramIndex<paramCount; paramIndex++)
			{
				var param = params[paramIndex];
				if(param != "")
				{
					var paramNameEnd = param.indexOf("=");
					if(paramNameEnd == -1)
						paramNameEnd = param.length;
						
					var paramName = param.substring(0, paramNameEnd);
					paramName = unescape(paramName);
					
					var paramValue = param.substring(paramNameEnd+1);
					paramValue = unescape(paramValue);
					
					pageParams[paramName] = paramValue;
				}
			}
			
			return pageParams;
		},
		get : function(paramName)
		{
			var pageParams = this.getAll();
			return pageParams[paramName];
		},
		set : function(paramsObj, mergeWithExistingParams)
		{
			Hash.setParams(paramsObj, mergeWithExistingParams);
		}
	};
	
	PublicClasses.Page.getParams = Params.getAll;
	
	var Page = {
		setTitleForPage : function(pageID)
		{
			var pageTitle = pages[pageID] == null ? 'Not Found' : pages[pageID].title;
			document.title = pageTitle;
		},
		load : function()
		{
			var $contentBody = $(contentBodySelector);
			$contentBody.empty();
			
			var items = pages[activePageID].items;
			loadItems(items, $contentBody, false);
			
			function loadItems(items, container, isGridRow)
			{
				var itemFlex = null,
					flexTotal = null;
					
				if(items.constructor == Array)
				{
					log('loading array:' + items.length);
					if(isGridRow)
					{
						flexTotal = 0;
						
						for(var i=0, n=items.length; i<n; i++)
						{
							var item = items[i];
							flexTotal += item.getFlex();
						}
					}
					
					for(var i=0, n=items.length; i<n; i++)
					{
						var item = items[i];
						if(isGridRow)
							itemFlex = item.getFlex();
					
						var itemContainer = createItem(item, itemFlex, flexTotal);
						if(item.getTarget() == null || isGridRow)
							container.append(itemContainer);
						else
							$(item.getTarget()).html(itemContainer);
					}
				}
				else
				{	
					log('loading single item');
					
					var item = items;
					
					if(isGridRow)
					{
						itemFlex = item.getFlex();
						flexTotal = 1;
					}
					
					var itemContainer = createItem(item, itemFlex, flexTotal);
					if(item.getTarget() == null || isGridRow)
						container.append(itemContainer);
					else
						$(item.getTarget()).html(itemContainer);
				}
			}
			
			function createItem(item, itemFlex, flexTotal)
			{
				if(item.constructor == PublicClasses.Module)
				{
					log('creating module');
					
					var module = item;
					var moduleContainer = buildModuleContainer(module, itemFlex, flexTotal);
					
					var moduleInterface = new ModuleInterface(moduleContainer);
					moduleInterface.setTitle(module.getTitle());
					module.moduleInterface = moduleInterface;
					
					if(module.isHeaderRefreshEnabled())
					{
						(function(module, pageID, moduleContainer)
						{
							moduleContainer.find('.moduleTitleRefreshButton').click(function()
							{
								refreshModule(module, pageID, module.getID());
							});
						}(module, activePageID, moduleContainer));
					}
					
					createModule(module, activePageID);
					
					return moduleContainer;
				}
				else if(item.constructor == PublicClasses.ModuleGrid)
				{
					log('loading module grid');
					
					var moduleGrid = item;
					var gridRows = moduleGrid.getItems();
					for(var i=0, n=gridRows.length; i<n; i++)
					{	
						var rowItems = gridRows[i];
						var $row = $('<div class="moduleContainerRow"></div>');
						loadItems(rowItems, $row, true);
						$contentBody.append($row);
					}
				}
			}
		},
		clear : function()
		{
			var items = pages[activePageID].items;
			destroyItems(items);
			
			function destroyItems(items)
			{
				if(items.constructor == Array)
				{
					for(var i=0, n=items.length; i<n; i++)
					{
						var item = items[i];
						destroyItem(item);
					}
				}
				else
				{	
					log('destroying single item');
					
					var item = items;
					destroyItem(item);
				}
			}
			
			function destroyItem(item)
			{
				if(item.constructor == PublicClasses.Module)
				{
					log('destroying module ' + item.getID());
					
					var module = item;
					module.destroy();
					module.moduleInterface.ondestroy();
				}
				else if(item.constructor == PublicClasses.ModuleGrid)
				{
					log('destroying module grid');
					
					var moduleGrid = item;
					var gridRows = moduleGrid.getItems();
					for(var i=0, n=gridRows.length; i<n; i++)
					{	
						var rowItems = gridRows[i];
						destroyItems(rowItems);
					}
				}
				
			}
		},
		setup : function(pageID, ignoreHash, _pageParams)
		{
			log('setting up the page for: ' + pageID);
			
			//if(activePageID == pageID)
			if(false)
				Page.refresh();
			else
			{
				if(ignoreHash !== true)
				{
					if(_pageParams != null && typeof _pageParams == 'object')
					{
						_pageParams[pageIDParam] = pageID;
						if(activePageID != null)
							Params.set(_pageParams);
						else
							Params.set(_pageParams, true);
					}
					else
					{
						var params = {};
						params[pageIDParam] = pageID;
						if(activePageID != null)
							Params.set(params);
						else
							Params.set(params, true);
					}
				}
				
				Page.setTitleForPage(pageID);
					
				if(activePageID != null)
					Page.clear();
				
				activePageID = null;
				
				if(pages[pageID] == null)
				{
					if(pages['pageNotFound'] == null)
						$(contentBodySelector).html('<div class="pageNotFound">Page not found</div>');
					else
					{
						pageID = 'pageNotFound';
						activePageID = pageID;
						Page.load(pageID);
					}
				}
				else
				{
					activePageID = pageID;
					Page.load(pageID);
				}
				
				onChangeCallback(pageID);
			}
		},
		refresh : function()
		{
			log('refreshing the page');
			var items = pages[activePageID].items;
			refreshItems(items);
			
			function refreshItems(items)
			{
				if(items.constructor == Array)
				{
					for(var i=0, n=items.length; i<n; i++)
					{
						var item = items[i];
						refreshItem(item);
					}
				}
				else
				{	
					var item = items;
					refreshItem(item);
				}
			}
			function refreshItem(item)
			{
				if(item.constructor == PublicClasses.Module)
				{
					log('refreshing module');
					refreshModule(item, activePageID);
				}
				else if(item.constructor == PublicClasses.ModuleGrid)
				{
					log('refreshing module grid');
					
					var moduleGrid = item;
					var gridRows = moduleGrid.getItems();
					for(var i=0, n=gridRows.length; i<n; i++)
					{	
						var rowItems = gridRows[i];
						refreshItems(rowItems);
					}
				}
				
			}
		}
	};
	
	//classes
	var NotificationQueueWrapper = (function()
	{
		var notificationsQueue = [],
			activeNotificationsCount = 0;
		
		function NotificationQueueWrapper(options)
		{
			var wrapperNotification = this;
			
			var onclose = options.onclose;
			
			options.onclose = function()
			{
				wrapperNotification.close();
				
				if(onclose != null)
					onclose();
			}
			
			this.notification = new Notification(options);
		}
		NotificationQueueWrapper.prototype.show = function()
		{
			if(notificationsLimit == null || activeNotificationsCount < notificationsLimit)
			{
				activeNotificationsCount++;
				this.notification.show();
			}
			else
				notificationsQueue.push(this);
				
			return this;
		}
		NotificationQueueWrapper.prototype.close = function(duration)
		{	
			activeNotificationsCount--;
			
			this.notification.close(duration);
			
			if(notificationsQueue.length > 0)
			{
				var nextNotification = notificationsQueue.shift();
				nextNotification.show();
			}
					
			return this;
		}
		
		return NotificationQueueWrapper;
	}());
	var Notification = (function()
	{
		function Notification(options)
		{
			var notification = this;
			
			this.content = options.content == null ? '' : options.content;
			this.onClickCallback = options.onclick == null ? null : options.onclick;
			this.onCloseCallback = options.onclose == null ? null : options.onclose;
			this.closeOnClick = options.closeOnClick == null ? false : options.closeOnClick;
			this.status = 'pending';
			this.focused = false;
			this.timedout = false;
			this.showTimeout = null;
			this.ignoreFadeout = false;
			
			this.notificationDiv = $('<div class="notification"></div>');
			this.notificationDiv.mouseenter(function()
			{
				if(notification.status == 'closed')
				{
					notification.status = 'shown';
					var notificationDiv = notification.notificationDiv;
					notification.ignoreFadeout = true;
					notificationDiv.stop(true, true).show();
				}
				
				notification.focused = true;
				clearTimeout(notification.showTimeout);
				notification.showTimeout = null;
				
			}).mouseleave(function()
			{
				notification.focused = false;
				
				if(notification.timedout || notification.showTimeout == null)
				{
					notification.timedout = false;
					
					notification.showTimeout = setTimeout(function()
					{
						notification.close();
						notification.timedout = true;
					}, 2000);
				}
			});
			
			var closeButton = $('<div class="notificationCloseButton">x</div>');
			this.notificationDiv.append(closeButton);
			
			closeButton.click(function()
			{
				clearTimeout(notification.showTimeout);
				notification.focused = false;
				notification.timedout = true;
				
				notification.close(500);
				
				event.stopPropagation();
			});
			
			closeButton = null;
			
			this.notificationDiv.append(this.content);
			
			this.notificationDiv.click(onClick);
			
			
			function onClick(event)
			{
				if(notification.closeOnClick)
					notification.close(500);
					
				if(notification.onClickCallback != null)
					notification.onClickCallback();
			}
		}
		Notification.prototype.show = function()
		{
			var notification = this;
			log('show');
			notification.status = 'shown';
			
			$('div.notifications').append(notification.notificationDiv);
			
			notification.notificationDiv.slideDown(function()
			{
				notification.showTimeout = setTimeout(function()
				{
					notification.close();
					notification.timedout = true;
				}, 4000);
			});
			
			return notification;
		}
		Notification.prototype.close = function(duration)
		{	
			duration = duration == null ? 2000 : duration;
			
			var notification = this;
			
			if(notification.focused)
				return notification;
				
			if(notification.status == 'closed')
				return notification;
				
			notification.status = 'closed';
			
			notification.notificationDiv.fadeOut(duration, function()
			{
				if(notification.ignoreFadeout)
				{
					notification.ignoreFadeout = false;
					return;
				}
				
				//delete all references so we dont leak memory
				notification.notificationDiv.remove();
				notification.notificationDiv = null;
				
				if(notification.onCloseCallback != null)
					notification.onCloseCallback();
			});
			
			return notification;
		}
		
		return Notification;
	}());
	
	function ModuleError(options)
	{
		this.code = options.code;
		this.message = options.message == null ? 'An unknown error occured' : options.message;
		this.contentUrl = options.contentUrl;
		this.contentRequestResponse = options.contentRequestResponse;
	}
	function ModuleInterface(domContainer)
	{
		var _title = '';
		var _domContainer = $(domContainer);
		
		this.getTitle = function()
		{
			return _title;
		}
		this.setTitle = function(title)
		{
			if(_domContainer != null)
			{
				_title = title;
				_domContainer.find('div.moduleContainerTitle').text(title);
			}
		}
		this.getContentArea = function()
		{
			return _domContainer == null ? null : _domContainer.find('div.moduleContainerContent');
		}
		this.ondestroy = function()
		{
			log('destoying');
			_title = null;
			_domContainer.remove();
			_domContainer = null;
		}
		this.showLoading = function()
		{
			_domContainer.find('div.moduleContainerContent').hide();
			_domContainer.find('div.moduleContainerContentLoadingScreen').show();
		}
		this.hideLoading = function()
		{
			_domContainer.find('div.moduleContainerContent').show();
			_domContainer.find('div.moduleContainerContentLoadingScreen').hide();
		}
	}
	
	//public functions
	function initialize(options)
	{
		initVariables(options);
		attachWindowEvents();
	}
	function start()
	{
		Page.setTitleForPage(startPageID);
		onChangeCallback(startPageID);
		Page.setup(startPageID);
	}
	function gotoPage(pageID, pageParams)
	{
		Page.setup(pageID, false, pageParams);
	}
	
	//private functions
	function loadModuleContent(module, callback)
	{
		if(pageContentCache[module.getContentUrl()] != null)
		{
			log('loading cached content of module ' + module.getID());
			module.moduleInterface.getContentArea().html(pageContentCache[module.getContentUrl()]);
			callback();
		}
		else if(module.getContentUrl() == null)
		{
			log('dont need to load content of module ' + module.getID());
			callback();
		}
		else
		{
			log('loading content of module ' + module.getID());
			var request = $.get(module.getContentUrl(), function(moduleContent)
			{
				pageContentCache[module.getContentUrl()] = moduleContent;
				module.moduleInterface.getContentArea().html(moduleContent);
				callback();
			});
			
			request.fail(function()
			{
				var moduleError = new ModuleError({
					code : 1,
					message : "Could not load content from location: '" + module.getContentUrl() + "'",
					contentUrl : module.getContentUrl(),
					contentRequestResponse : ''
				});

				callback(moduleError);
			});
		}
	}
	function createModule(module, pageID)
	{	
		log('creating module ' + module.getID());
		module.moduleInterface.showLoading();
		
		loadModuleContent(module, function(moduleError)
		{
			if(moduleError != null)
			{
				module.moduleInterface.hideLoading();
				module.error(module.moduleInterface, moduleError);
			}
			else
				initModule(module, pageID);
		});
		
		function initModule(module, pageID)
		{
			module.destroy();
			
			module.init(Params.getAll(), function()
			{
				if(activePageID === pageID) //???
				{
					log('ondisplaying module ' + module.getID());
					module.moduleInterface.hideLoading();
					
					try
					{
						module.display(module.moduleInterface, Params.getAll());
					}
					catch(error)
					{
						log('ERROR: ' + error.message);
						module.moduleInterface.getContentArea().html('<span class="error">Error loading content</span>');
					}
				}
			});
		}
	}
	function buildModuleContainer(module, moduleFlex, flexTotal)
	{
		var headerEnabled = module.isHeaderEnabled();
		var refreshEnabled = module.isHeaderRefreshEnabled();
		var classes = module.getClasses();
		var moduleLoadingContent = module.getLoadingScreenContent().clone();
		var moduleContainerHolder = $('<div class="moduleContainerHolder"/>');
		var moduleContainerShell = $('<div class="moduleContainerShell"/>');
		var moduleContainer = $('<div class="moduleContainer"/>');
		for(var i=0, n=classes.length; i<n; i++)
		{
			var cls = classes[i];
			moduleContainer.addClass(cls);
		}
		
		moduleContainerShell.append(moduleContainer);
		if(moduleFlex != null)
		{
			var moduleWidth =  moduleFlex/flexTotal*100;
			moduleContainerHolder.css('width', moduleWidth + '%');
		}
		if(headerEnabled)
		{
			var moduleHeader = $('<div class="moduleContainerHeader"></div>');
			var moduleTitle = $('<div class="moduleContainerTitle"></div>');
			moduleHeader.append(moduleTitle);
			
			if(refreshEnabled)
			{
				var refreshButton = $('<img height="15px" class="moduleTitleRefreshButton" src="' + refreshImageUrl + '" />');
				moduleHeader.append(refreshButton);
			}
			
			moduleContainer.append(moduleHeader);
		}
		
		moduleContainer.append(moduleLoadingContent);
		var moduleContent = $('<div class="moduleContainerContent"/>');
		moduleContainer.append(moduleContent);
		moduleContent.hide();
		moduleContainerHolder.append(moduleContainerShell);
		
		return moduleContainerHolder;
	}
	function refreshModule(module, pageID)
	{
		if(module.refresh != null)
			module.refresh(module.moduleInterface, Params.getAll());
		else
		{
			//show loading screen
			createModule(module, pageID);
		}
	}
	function getItem(pageID, moduleID)
	{
		for(var i=0, n=pages.length; i<n; i++)
		{
			var page = pages[i];
			if(page.id == pageID)
			{
				if(moduleID == null)
					return page;
					
				var pageItems = page.items == null ? [] : page.items;
				for(var i=0, n=pages.length; i<n; i++)
				{
					
				}
			}
		}
	}
	function getModule(pageID, moduleID)
	{
		var pageModules = pages[pageID].modules;
		
		for(var i=0, n=pageModules.length; i<n; i++)
		{
			var rowModules = pageModules[i];
			if(rowModules[moduleID] != null)
			{
				return rowModules[moduleID];
			}
		}
	}
	function attachWindowEvents()
	{
		window.onhashchange = Hash.onChange;
	}
	function initVariables(options)
	{
		log('setting variables...');
		
		pageIDParam = options.pageIDParam == null ? pageIDParam : options.pageIDParam;
		
		notificationsLimit = options.notificationsLimit == null ? notificationsLimit : options.notificationsLimit;
		
		contentBodySelector = options.target;
		
		enableHeaders = options.headers == null ? enableHeaders : options.headers;
		
		enableRefresh = options.refresh == null ? enableRefresh : options.refresh;
		
		moduleLoadingScreen = options.loadingScreen == null ? moduleLoadingScreen : options.loadingScreen;
		
		//pages = options.pages == null ? [] : options.pages;
		
		setPages(options.pages);
		
		onChangeCallback = function(pageID)
		{
			if(options.onChange != null)
				options.onChange(pageID);
		}

		startPageID = Params.get(pageIDParam);
		if(startPageID == null || startPageID == "" || pages[startPageID] == null)
			startPageID = options.startPage;
		
		if(startPageID == null)
		{
			for(var pageID in pages)
			{
				startPageID = pages[pageID].id;
				break;
			}
		}
		log('start page is: ' + startPageID);
		
		function setPages(pagesValue)
		{
			log('setting pages...');
			pages = {};		
			
			for(var i=0, n=pagesValue.length; i<n; i++)
			{
				var page = pagesValue[i];
				if(page.id != null)
				{
					pages[page.id] = page;
				}
			}
		}
	}
	function log(text)
	{
		try {
			console.log('\n' + text);
		}
		catch(e) {}
	}
	
	var PageManager = {
		init : initialize,
		start : start,
		gotoPage : gotoPage,
		Notification : NotificationQueueWrapper,
		Page : PublicClasses.Page,
		Module : PublicClasses.Module,
		ModuleGrid : PublicClasses.ModuleGrid
	};
	
	return PageManager;
}());
