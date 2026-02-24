"use strict";

function breakdownTime(seconds) {
	// takes in [x] seconds, returning Yrs,months,etc
    const units = [
        { label: "year",   secs: 31536000 },   // 365 days
        { label: "month",  secs: 2628000 },    // 30.44 days
        { label: "week",   secs: 604800 },
        { label: "day",    secs: 86400 },
        { label: "hour",   secs: 3600 },
        { label: "minute", secs: 60 },
        { label: "second", secs: 1 }
    ];

    const parts = [];

    for (const u of units) {
        const value = Math.floor(seconds / u.secs);
        if (value > 0) {
            parts.push(`${value}${u.label}${value !== 1 ? "s" : ""}`);
            seconds -= value * u.secs;
        }
    }

    return parts.join(" ");
}



function convertFloatToHoursAndMinutes(floatVar) {
    checkType(floatVar,'number') && (floatVar*=1);

    let hours = floatVar/1|0;
    let minutes = floatVar%1*60;

    return `${hours}h ${minutes.toString().padStart(2,'0')}m`;
};

function getDayDelta(dayName) {
    let dNS = consts.dayNamesShort;
    if (!dNS.includes(dayName)) return false;

    let modDNS = [...consts.dayNamesShort];
    let sunday= modDNS.shift();
    modDNS.push(sunday);
    let index = modDNS.findIndex(d=>d===dayName); // this is actually the delta from monday!
    return index;
};

function getDayNameFromInt(i) {
    i = i%6;

    let dayNamesShort = consts.dayNamesShort;
    let dayNamesLong = consts.dayNamesLong;

    return { short: dayNamesShort[i], long: dayNamesLong[i] };
}








String.prototype.capitalise = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

function convertFromIntToMonthNameShort(monthInt) {
    let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[monthInt-1] || false;
};

function convertFromIntToMonthNameLong(monthInt) {
    let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[monthInt-1] || false;
};

function arraySortByKey(array, key) {
    if (!Array.isArray(array)) return false;
    // you can tell this was written by someone else. this sort could easily be 1 line
    return array.sort(function(a, b) {
        let x;
        if (typeof a[key] !== 'string' || typeof b[key] !== 'string') {
            x = a[key]; var y = b[key];
        } else {
            x = a[key].toLowerCase(); var y = b[key].toLowerCase();
        };
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
};

var checkType = (_variable, _type)=> {
    let valid = false; // the default response is "false"

    switch (_type) {
        case 'array':
            valid = Array.isArray(_variable) ? true: false;
        break;

        case 'boolean': case 'bool':
            valid = typeof _variable === 'boolean' ? true : false;
        break;

        case 'float':
            valid = !Number.isInteger(_variable) && typeof _variable==='number' ? true : false;
        break;

        case 'integer': case 'int':
            valid = Number.isInteger(_variable) ? true : false;
        break;

        case 'number':
            valid = typeof _variable === 'string' && !isNaN(_variable*1) ? true : false;
        break;

        case 'object':
            valid = typeof _variable === 'object' ? true : false;
        break;

        case 'string': case 'str':
            valid = typeof _variable === 'string' ? true : false;
        break;

        default:
            console.error(`This type (${_type}) has no check!\nUnable to test variables validity.`);
            valid = false;
        break;
    };

    return valid;
};

function Clamp(value,min,max) {
    return value<min ? min : value>max ? max : value;
}

function convertSecondsToHMS(_time, _returnDays=false) {
    let d=0;
    if (_time>60*60*24 && _returnDays) {
        let dMult = 60*60*24;
        d = _time/dMult|0;
        _time = _time%dMult;
    };
    let h = _time/3600|0;
    let secondsLeft = _time%3600;
    let m = secondsLeft/60|0;
    secondsLeft = secondsLeft%60;
    let s = secondsLeft|0;
    let returnVal = { h: h, m: m, s: s };
    _returnDays && (returnVal = {...{d: d}, ...returnVal});
    return returnVal;
}

function convertToRoman(num) {
    let roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';

    for (let i of Object.keys(roman)) {
        let q = ~~(num / roman[i]);
        num -= q * roman[i];
        str += i.repeat(q);
    };

    return str;
};

var crc32=function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};

function framesToMs(_frames) {
    if (Number.isInteger(_frames)) {
        return 1000/60*_frames;
    } else {
        return false;
    };
};

function generateRandomID(_g=false) {
    let generatedID = '';
    let maxC = _g ? 16 : 8;
    for (let i=0; i<maxC; i++) {
        generatedID +=~~((Math.random()*9)+1).toString();
    };
    return generatedID;
};

const generateAlphaNumericID = function(_length=8) { // generates a random string of numbers and letters (a-zA-Z0-9) of length _length
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < _length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    };
    return result;
};

function getStringExtForInt(_int) {
    if (!Number.isInteger(_int)) return false;

    let str = _int.toString();
    let ext = 'th';
    if (str.substr(-1)==='1' && _int!==11) {
        ext = 'st';
    } else if (str.substr(-1)==='2' && _int!==12) {
        ext = 'nd';
    } else if (str.substr(-1)==='3' && _int!==13) {
        ext = 'rd';
    }
    return ext;
};

function isVar(searchFor='Phaser') {
    let message = '';
    if (searchFor==='Phaser') { message = 'No variable passed... Searching for Phaser variable\n'; }
    for(var q in window) { 
        if(window.hasOwnProperty(q) && q===searchFor) {
            message += `Found the variable '${searchFor}'`;
            console.log(message);
            return true;
        }
    }
    return false;
};

function randomiseArray(a,b,c,d) {
    c=a.length;while(c)b=Math.random()*(--c+1)|0,d=a[c],a[c]=a[b],a[b]=d
};

function radToDeg(_rad) {
    return 180/Math.PI*_rad;
};

const rnd = function(min, max) {
    if (typeof min === 'number' && typeof max === 'number') {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (Array.isArray(min)) {
        return min[Math.floor(Math.random() * min.length)];
    } else if (typeof min === 'string') {
        return min.charAt(Math.floor(Math.random() * min.length));
    } else {
        console.error('Invalid arguments passed to rnd function. Expected number, array, or string.');
        return null;
    };
};
const rndTest = (testCount=50000, lower=1000, upper=6000)=> {
    console.log(`Testing random number generation with ${testCount.toLocaleString()} tests. Min set to ${lower}, max set to ${upper}`);
    let min = Infinity;
    let max = -Infinity;
    let t = performance.now();
    for (let i=0;i<testCount; i++) {
        let n = rnd(lower,upper)
        n<min && (min=n);
        n>max && (max=n);
    };
    t = performance.now()-t;
    console.log(`Total tests done: ${testCount.toLocaleString()}. Min/Max: ${min},${max}.\nTime taken: ${t.toFixed(3)}ms`);
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    };
    return array;
}


var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);