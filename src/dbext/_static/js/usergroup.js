var usergroup = 
{
    guser:null,
    init()
    {
        if (this.guser) this.guser = Object.fromEntries(Object.entries(this.guser).map(([k,v])=>[k.toLowerCase(),v]));
        const btn_group_schema = document.querySelector('#btn_group_schema');
        if (btn_group_schema) btn_group_schema.addEventListener('click', e => this.showGroupSchema());
    },
    showGroupSchema()
    {
        if (this.guser)
        {
            let endpoint = usergroup.url_profile.replace('@id', this.guser.sys_pk) + "?_output=raw&iframe=true";
            let mdl_ss_content = document.querySelector('#mdl_ss_content');
            if (mdl_ss_content) mdl_ss_content.src = endpoint;
            main.openModal('modal_secure_schema');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    usergroup.init();
});