'use strict';
var exec = require('child_process').exec;
require('fis-kernel');
var componentroot = process.cwd() + '/componentroot';
var checkout = function(done) {
	exec('git clone https://github.com/webzhangnan/component-publish-test.git ' + componentroot, done);
}
var remove = function(done) {
	exec('rm -rf ' + componentroot, done);
}
var publish = require('../index');
var componentObj = {
    "name": "abc",
    "main": "main.js",
    "version": "0.0.1",
    "files": [
        "main.js",
        "main.css",
        "main.html"
    ]
};
function getComponentObj(){
    return JSON.parse( JSON.stringify(componentObj) );
}
describe('publish', function() {
    var compRoot = fis.util(process.cwd() + '/abc');
    describe('#checkComponent()', function() {
        before(function(){
            fis.util.del(compRoot);
            fis.util.mkdir( compRoot );
            componentObj.files.forEach(function(val){
                fis.util.write(compRoot + '/' + val, '');
            });
        });
        after(function(){
            fis.util.del(compRoot);
        });
        var compoPath = fis.util(compRoot + '/component.json');
        var write = fis.util.write;
        var stringify = JSON.stringify;
        var compoJSON;
        it('should check component.json', function() {
            compoJSON = getComponentObj();
            write(compoPath, stringify(compoJSON));
            publish.checkComponent(compoPath).should.be.equal(0, 'Should Check pass');

            compoJSON = getComponentObj();
            delete compoJSON.name;
            write(compoPath, stringify(compoJSON));
            publish.checkComponent(compoPath).should.be.equal(1, 'Should Miss name');

            compoJSON = getComponentObj();
            compoJSON.name = '/abc';
            write(compoPath, stringify(compoJSON));
            publish.checkComponent(compoPath).should.be.equal(2, 'Should Unable name');


            compoJSON = getComponentObj();
            compoJSON.version = 'v1.23';
            write(compoPath, stringify(compoJSON));
            publish.checkComponent(compoPath).should.be.equal(3, 'Should Unable version');

            compoJSON = getComponentObj();
            delete compoJSON.main;
            delete compoJSON.files;
            write(compoPath, stringify(compoJSON));
            publish.checkComponent(compoPath).should.be.equal(4, 'Should Haven\'t file of installable');


            compoJSON = getComponentObj();
            write(compoPath, stringify(compoJSON));
            fis.util.del(compRoot + '/main.js' );
            fis.util.del(compRoot + '/main.css' );
            publish.checkComponent(compoPath).should.be.equal(5, 'Should no exists file');
        });

    });
	describe('#pushTag()', function() {
		before(function(done){
            remove(function(){
                checkout(done);
            })
        });
		after(remove);
        var version;
        beforeEach(function(done){
            var comPath = componentroot + '/component.json';
            var comJSON = fis.util.read(comPath);
            comJSON = JSON.parse(comJSON);
            version = comJSON.version.split('.');
            version[version.length -1]++;
            version = comJSON.version =  version.join('.');
            fis.util.write(comPath, JSON.stringify(comJSON, null, '\t'));
            exec('cd ' + componentroot + ' && git commit -am "update for UnitTest" && git push origin master', done);
        });
		it('should publish version the in component.json', function(done) {
			publish.pushTag.should.be.a.funciton;
            publish.pushTag(componentroot ,function(){
                exec('cd '+ componentroot + ' && git tag', function(err, stdout, stderr){
                    (null == err).should.be.ok;
                    var msg = stdout.trim() || stderr.trim();
                    msg.indexOf(version).should.not.equal(-1);
                    done();
                })
            });
		});

	});

	describe('#pushVersion()', function() {
		before(function(done){
            remove(function(){
                checkout(done);
            })
        });
        after(remove);
         
		it('should publish version be certained', function(done) {
            var comPath = componentroot + '/component.json';
            var comJSON = fis.util.read(comPath);
            comJSON = JSON.parse(comJSON);
            var version = comJSON.version.split('.');
            version[version.length -1]++;
            version = version.join('.');
			publish.pushVersion.should.be.a.funciton;
            publish.pushVersion(version, componentroot ,function(){
                JSON.parse(fis.util.read(comPath)).version.should.be.equal(version);
                publish.exeCmdIsClean(componentroot, function(err){
                    (undefined === err).should.be.equal(true, 'after pushVersion is branch status clean');
                    done();
                });
            });
		});
	});

    describe('#isStatusClean()', function() {
        var comPath = componentroot + '/component.json';
        before(function(done){
            remove(function(){
                checkout(done);
            })
        });
        after(remove);
         
        it('should publish isStatusClean call pass', function(done) {
            publish.isStatusClean.should.be.a.funciton;
            exec('cd ' + componentroot + ' && git status', function(err, stdout, stderr){
                var msg = stdout.trim() || stderr.trim();
                publish.isStatusClean(msg).should.be.equal(true, 'compare stdout pass');
                done()
            })
        });
    });

    describe('#exeCmdIsClean()', function() {
        var comPath = componentroot + '/component.json';
        before(function(done){
            remove(function(){
                checkout(done);
            })
        });
        after(remove);
         
        it('should publish exeCmdIsClean call pass', function(done) {
            publish.exeCmdIsClean.should.be.a.funciton;
            publish.exeCmdIsClean(componentroot,function(err){
                (undefined == err).should.be.ok;
                done()
            });
        });
    });


});