module.exports = {
    getUTCDate : () => {
        let d = new Date()
        let month = '' + (d.getUTCMonth() + 1);
        let day = '' + d.getUTCDate();
        let year = d.getUTCFullYear();
        let hour = ''+ d.getUTCHours();
        let min = '' + d.getUTCMinutes();
        let seconds = '' + d.getUTCSeconds();
    
    
        if (month.length < 2){month = '0' + month};
        if (day.length < 2){day = '0' + day};
        if (hour.length < 2){hour = '0' + hour};
        if (min.length < 2){min = '0' + min};
        if (seconds.length < 2){seconds = '0' + seconds};
    
        return [year, month, day].join('-') + ' ' + [hour, min, seconds].join(':');
    }
}