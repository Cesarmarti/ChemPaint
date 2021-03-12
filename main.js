const {app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron') 
const url = require('url') 
const path = require('path')  

let win  


function createWindow() { 
	//height - 62, width - 19 ??
	win = new BrowserWindow({ width: 1280, height: 720, webPreferences: { nodeIntegration: true,contextIsolation: false,enableRemoteModule: true } });
	win.loadURL(url.format ({ 
		pathname: path.join(__dirname, 'index.html'), 
		protocol: 'file:', 
		slashes: true 
	}))
}  

const template = [
   {
      label: 'File',
      submenu: [
         {
            label: 'Save',
            click: function(){
            	const {dialog} = require('electron') 
				dialog.showSaveDialog(function (fileNames) { 	 
				  if(fileNames === undefined) { 
				     console.log("No name given"); 
				  
				  } else { 
				     win.webContents.send('getImage', fileNames); 
				  } 
				});
            	
            }
         }
      ]
   },
   
   {
      label: 'View',
      submenu: [
         {
            role: 'reload'
         },
         {
            role: 'toggledevtools'
         },
         {
            type: 'separator'
         },
         {
            role: 'resetzoom'
         },
         {
            role: 'zoomin'
         },
         {
            role: 'zoomout'
         },
         {
            type: 'separator'
         },
         {
            role: 'togglefullscreen'
         }
      ]
   },
   
   {
      role: 'window',
      submenu: [
         {
            role: 'minimize'
         },
         {
            role: 'close'
         }
      ]
   }
   
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

app.on('ready', createWindow) 
