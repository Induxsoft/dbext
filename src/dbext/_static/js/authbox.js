
document.addEventListener("DOMContentLoaded",()=>
{
    auth.init();
});
var auth=
{
    init()
    {
        auth.form_search=document.getElementById("form_search");
        auth.select_filter=document.getElementById("select_filter");

        if(auth.select_filter)auth.select_filter.addEventListener("change",()=>
        {
            if(auth.form_search)auth.form_search.submit();
        })
    }
}