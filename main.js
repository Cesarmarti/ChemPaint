const {app, BrowserWindow} = require('electron') 
const url = require('url') 
const path = require('path')  

let win  

function createWindow() { 
	//height - 62, width - 19 ??
	win = new BrowserWindow({width: 1280, height: 720}) 
	win.loadURL(url.format ({ 
		pathname: path.join(__dirname, 'index.html'), 
		protocol: 'file:', 
		slashes: true 
	}))

	/*win.on('resize', function () {
		var size   = win.getSize();
		var width  = size[0];
		var height = size[1];
		console.log("width: " + width);
		console.log("height: " + height);
	});*/ 
}  

app.on('ready', createWindow) 
