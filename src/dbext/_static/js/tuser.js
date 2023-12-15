var tuser = 
{
    user:null, url:'',
    init()
    {
        const pwd1 = document.querySelector('#pwd1');
        const pwd_confirm1 = document.querySelector('#pwd_confirm1');
        const pwdMessage1 = document.querySelector('#pwdMessage1');
        const pwd2 = document.querySelector('#pwd2');
        const pwd_confirm2 = document.querySelector('#pwd_confirm2');
        const pwdMessage2 = document.querySelector('#pwdMessage2');
        const form = document.querySelector('#form');

        if (form) form.addEventListener('submit', this.beforeSubmitForm);
        if (pwd1 && pwd_confirm1) {
            [pwd1,pwd_confirm1].forEach(c => c.addEventListener('keyup', e => { this.validePwd(pwd1.value, pwd_confirm1.value, pwdMessage1) }));
        }
        if (pwd2 && pwd_confirm2) {
            [pwd2,pwd_confirm2].forEach(c => c.addEventListener('keyup', e => { this.validePwd(pwd2.value, pwd_confirm2.value, pwdMessage2) }));
        }
    },
    changePwd()
    {
        let values = main.getValues('mdl_cpwd_controls', true);
        if (values==null) return;

        if (!this.validePwd(values.pwd, values.pwd_confirm)) {
            alert("Las contraseñas no coinciden");
            return;
        }

        delete values.pwd_confirm;

        let endpoint = this.url.replace('@id', this.user.sys_pk);

        InduxsoftCrudlModel.InvokeService(endpoint, values, 
            success => { 
                console.log(success);
                main.clearValues('mdl_cpwd_controls');
                main.closeModal('modal_change_pwd');
                this.changeSysRecver(success);
            },
            failure => { alert('No fue posible cambiar la contraseña\n' + JSON.stringify(failure)) },
            'PUT', false
        );
    },
    validePwd(val1, val2, message)
    {
        if (val1 != val2) {
            if (message) message.textContent = 'La contraseña no coincide.';
            return false;
        }
        else if (message) message.textContent = '';
        
        return true;
    },
    beforeSubmitForm(e)
    {
        let input_groups = document.querySelector('#inputGroups');
        let cl_user_groups = document.querySelector('#cl_user_groups');

        if (input_groups && cl_user_groups)
        {
            let data = cl_user_groups.getData(true);
            if (data) input_groups.value = JSON.stringify(data.items.filter(d=>d.done).map(d=>{return d.id}));
        }
    },
    changeSysRecver(userData)
    {
        const inputRecVer = document.querySelector('#form input[name="sys_recver"]');
        if (inputRecVer) inputRecVer.value = userData.sys_recver;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    tuser.init();
})