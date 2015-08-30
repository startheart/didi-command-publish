'use strict';

var child_process = require('child_process');
var path = require('path');
var resFields = [    // resource fields in component.json
    'main', 'scripts', 'styles',
    'json', 'images', 'templates',
    'fonts', 'files'
];
var regVersion = /^\d[0-9\.]+\d$/;
var regName = /^[^\.\/\\]+$/;

exports.name = 'publish';
exports.usage = '[options]';
exports.desc = 'A awesome publish for component of fis-didi';
exports.register = function(commander) {
	commander.on('--help', function() {
		console.log('Publishes \'.\' ');
	});
	commander
		.option('-t, --tag <name>', 'specify publish tag', String)
	commander.action(function() {
		var args = Array.prototype.slice.call(arguments);
		var options = args.pop();
		var cmd = args.shift();
		var repositoryRoot = process.cwd();
		var next = [function(done){
			prePush(repositoryRoot, done);
		}];
		if (options.tag) {
			next[next.length] = function(done){
				pushVersion(options.tag, repositoryRoot, done);
			};
		} 
		next[next.length] = function(){
			pushTag(repositoryRoot, done);
		}
		next.shift()(done);
		function done(err){
			if(err){
				return print_faq();
			}
			next.length ?
			next.shift()(done) :
			fis.log.notice('Successful');
		}
	});
}

//获取component.json
function get_conf(root) {
	root = root || fis.util.realpath(process.cwd());
	var filename = "component.json",
		conf;

	var cwd = root,
		pos = cwd.length;
	do {
		cwd = cwd.substring(0, pos);
		conf = cwd + '/' + filename;
		if (fis.util.exists(conf)) {
			root = cwd;
			break;
		} else {
			conf = false;
			pos = cwd.lastIndexOf('/');
		}
	} while (pos > 0);

	return conf;
}

function cd(dir) {
	return 'cd ' + dir + ' && ';
}

function prePush(repositoryRoot, callback){
	var componentPath = get_conf(repositoryRoot);
	if( checkComponent(componentPath) !== 0){
		fis.log.error('发布失败');
		return;
	}
	var done = function(err){
		if(err){
			callback(err);
			return;
		}
		next.length ?
		next.shift()(repositoryRoot, done) :
		callback();
	};
	var next = [];
	next[next.length] = exeCmdIsClean;
	next[next.length] = exeCmdIsRemoteOrigin;
	next.shift()(repositoryRoot ,done);
}

function pushVersion(version, repositoryRoot, callback) {
	callback = callback || function(){};
	repositoryRoot = repositoryRoot || process.cwd();
	var configPath = get_conf(repositoryRoot);
	version = (version || '').trim();
	var cmdCommitAndPushOrigin = 'git commit -am \'update new tag ' + version + ' use [didi publish] \' && git push origin master';
	cmdCommitAndPushOrigin = cd(repositoryRoot) + cmdCommitAndPushOrigin;
	var componentJSON = JSON.parse(fis.util.read(configPath));
	if( !!regVersion.test(version) === false ){
		var msg = checkMap['3']({
			version: version,
			regVersion: regVersion.toString()
		});
		fis.log.warning(msg);
		callback('Unable version');
		return;
	}
	//没有修改
	if (componentJSON.version === version) {
		callback();
		return 
	}

	componentJSON.version = version;
	fis.util.write(configPath, JSON.stringify(componentJSON, null, '\t'));
	exeCmd(cmdCommitAndPushOrigin,	finish);
	function finish(err, stdout) {
		if(err){
			callback(err);
			return;
		}
		if ( isPushRemoteSuccess(stdout) ) {
			callback();
			return ;
		}
		callback(stdout);
	}
}

function pushTag(repositoryRoot, callback) {
	callback = callback || function() {};
	repositoryRoot = repositoryRoot || process.cwd();
	var configPath = get_conf(repositoryRoot);
	var componentJSON = JSON.parse(fis.util.read(configPath));
	var version = componentJSON.version;
	version = version.trim();
	var cmdAddVersion = 'git tag -a {-version-} -m \'create tag v{-version-} use didi publish\' && git push origin --tags';
	cmdAddVersion = cd(repositoryRoot) + cmdAddVersion;
	var data = {
		version: version
	};
	cmdAddVersion = parseTpl(cmdAddVersion, data); 
	exeCmd(cmdAddVersion, finish);
	function finish(err, stdout) {
		if(err){
			callback(err);
			return;
		}
		if (isPushTagSuccess(stdout)) {
			callback();
		}else{
			callback(stdout);
		}
	}	
}


function exeCmdIsClean(repositoryRoot, callback){
	var cmdStatus = 'git status';
	cmdStatus = cd(repositoryRoot) + cmdStatus;
	exeCmd(cmdStatus, function(err, stdout) {
		if(err){
			return callback(err);
		}
		if (isStatusClean(stdout)) {
			callback();
		} else {
			callback(stdout);
		}
	});
}

function exeCmdIsRemoteOrigin(repositoryRoot, callback){
	var cmdRemote = 'git remote -v';
	cmdRemote = cd(repositoryRoot) + cmdRemote;
	exeCmd(cmdRemote, function(err, stdout) {
		if(err){
			return callback(err);
		}
		if (stdout.match(/^origin\s+/)) {
			callback();
		} else {
			callback(stdout);
		}
	});
}

function isStatusClean(stdout) {
	var cleanModel = ["On branch master", "Your branch is up-to-date with 'origin/master'.", "nothing to commit, working directory clean"];
	stdout = stdout.trim().split(/\n|\r/);
	if ( stdout[0].toLowerCase().trim() !== cleanModel[0].toLowerCase().trim()
		||  stdout[stdout.length -1].toLowerCase().trim() !== cleanModel[cleanModel.length - 1].toLowerCase().trim()
		) {
		return false;
	}
	return true;
}

function isPushTagSuccess(stdout) {
	return stdout.indexOf('* [new tag]') > 0;
}
function isPushRemoteSuccess(stdout){
	stdout = stdout.split(/\n|\r/);
	var reg = /\[master [^\]]+\] update new tag [0-9\.]+ use \[didi publish\]/;
	return stdout[0].match(reg);
}
function exeCmd(cmd, cb) {
	cb = cb || function(err) {	err && print_faq() };
	var finishData = ['-', '-'];
	var git = child_process.exec(cmd, function(err, stdout, stderr) {
		if (err) {
			return cb(err);
		}
		finishData[0] = (stdout || '').trim() || (stderr || '').trim();
		fnish();
	});
	git.stdout.pipe(process.stdout);
	git.stderr.pipe(process.stderr);

	git.on('exit', function(code) {
		finishData[1] = code
		fnish();
	});

	function fnish() {
		if (finishData[0] === '-' || finishData[0] === '-') {
			return;
		}
		if (finishData[1] === 1) {
			cb('Cmd happend fatal: ' + cmd);
		} else {
			cb(null ,finishData[0]);
		}
	}
}

var checkMap = {
	'1': function(){
		return '[检查失败] 请在component.json中添加[name]字段';
	},	
	'2': function(data){
		return parseTpl('[检查失败] component.json中[name]字段值[{-name-}]不符合规则: {-regName-}' , data);
	},	
	'3': function(data){
		return parseTpl('[检查失败] 版本号[{-version-}]不符合规则: {-regVersion-}', data); 
	},	
	'4': function(data){
		return parseTpl('[检查失败] 未指定任何安装文件，需在component.json添加以下至少一个字段: {-resFields-}', data );
	},	
	'5': function(data){
		return parseTpl('[检查失败] component.json中指定的以下文件不存在: {-notExistsFile-}', data);
	},
};

function checkComponent(componentPath){
	componentPath = componentPath || get_conf();
	var componentJSON = fis.util.read(componentPath);
	componentJSON = JSON.parse(componentJSON);
	var rootDir = path.dirname(componentPath);
	var notExistsFile = [];
	var hasFields = resFields.reduce(function(pre, item){
		return item in componentJSON ? pre.concat(item) : pre;
	}, []);
	var failID = 0;
	//1
	failID++;
	if(!!componentJSON.name === false){
		fis.log.warning( checkMap[failID]() );
		return failID;
	}
	//2
	failID++;
	if( !!componentJSON.name.match(regName) === false ){
		fis.log.warning( 
			checkMap[failID]({
				name: componentJSON.name,
				regName: regName.toString()
			})
		);
		return failID;
	}
	//3
	failID++;
	if( !!componentJSON.version.match(regVersion) === false ){
		fis.log.warning(
			checkMap[failID](
				{
					version: componentJSON.version,
					regVersion: regVersion.toString()
				}
			)
		);
		return failID;
	}
	//4
	failID++;
	if( hasFields.length === 0){
		fis.log.warning(
			checkMap[failID](
				{
					resFields: resFields.join('\r\n')
				}
			)
		);
		return failID;
	}
	hasFields.forEach(function(filed){
		var filedList = componentJSON[filed];
		if( 'string' === typeof filedList){
			filedList = [filedList];
		}
		filedList.forEach(function(filename){
			var filePath = path.join(rootDir, filename);
			if( fis.util.exists(filePath) === false ){
				notExistsFile.push(filePath);
			}

		})
	});
	//5
	failID++;
	if(notExistsFile.length > 0){
		fis.log.warning( checkMap[failID](
			{
				notExistsFile: notExistsFile.join('\r\n')
			}
		) );
		return failID;
	}
	return 0;
}
function print_faq() {
	var faqList = [
		'\n\n发布失败，请确认：'.bold.red,
		'1、component项目文件夹内执行',
		'2、所有修改都已经push到远程仓库(git status)',
		'3、已设置origin设置为远程仓库url地址(git remote -v)',
		'4、处于本地仓库的master分支',
		'5、与如下已发布版本的号不同(component.json)'
	];
	exeCmd('git tag', function(){

	});
	fis.log.warning(faqList.join('\n'));
}
function parseTpl(str, data){
	return str.replace(/\{\-([^\-]+)\-\}/g, function(code, key) {
		return data[key.trim()] || '';
	})
}

exports.pushTag = pushTag;
exports.pushVersion = pushVersion;
exports.checkComponent = checkComponent;
exports.prePush = prePush;
exports.isPushRemoteSuccess = isPushRemoteSuccess;
exports.isPushTagSuccess = isPushTagSuccess;
exports.exeCmdIsRemoteOrigin = exeCmdIsRemoteOrigin;
exports.exeCmdIsClean = exeCmdIsClean;
exports.isStatusClean = isStatusClean;
exports.get_conf = exeCmdIsClean;







