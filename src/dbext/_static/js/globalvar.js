var globalvar =
{
    tableCategories:null, tableCId:'',

    init()
    {
        this.tableCategories = document.querySelector(this.tableCId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalvar.init();
});