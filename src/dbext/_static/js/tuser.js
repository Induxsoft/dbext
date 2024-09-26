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


var batch=
{
    init()
    {
        //batch users
        this.file=document.getElementById("file");
        if(this.file)this.file.addEventListener("change",()=>{batch.ProgramFile();});

        if(this.url_taskman)this.url_get_program_status = this.url_taskman.replace("{id}",this.id_jog)+"?_act=get-program-status";
        if(this.url_taskman)this.url_get_program_log = this.url_taskman.replace("{id}",this.id_jog)+"?_act=get-program-log&job_token="+this.job;
        this.btn_run_program = document.getElementById("btn_run_program");
        this.spinner = document.getElementById("spinner");

        if (this.spinner && this.btn_run_program) 
        {
            if(this.show_spinner)
                if(this.btn_run_program)this.btn_run_program.classList.add("event-none");
            else if(this.btn_run_program)this.btn_run_program.classList.remove("event-none");
            
            if(this.job.trim()!="")
                setInterval(()=>{this.checkProgramStatus(this.spinner, this.btn_run_program)}, this.interval_time);
        }
    },
    ProgramFile()
    {
        var data=new FormData();
        if(!this.file)return;
        var lng=this.file.files.length;
        
        if(lng<1)return;
        if(this.id_jog<1)return;

        for (let i = 0; i <lng ; i++) 
        {
            const element = this.file.files[i];
            data.append("file",element);
        }
        var fd={}
        InduxsoftCrudlModel.InvokeService(this.url_taskman.replace("{id}",this.id_jog)+"?upload=program-files", data,
            (result) => 
            { 
                Object.entries(result).forEach(entry => 
                {
                    const [key,value] = entry;
                    fd[key] = value;
                });
                this.checkJob(fd); 
            },
            (error) => 
            {
                this.file.value=""; 
                alert(error.message ?? JSON.stringify(error)); 
            },
        "PUT", false, false, "", true);
    },
    checkJob(data)
    {
        
        if(this.spinner)this.spinner.classList.remove("d-none");
        let endpoint = this.url_taskman.replace("{id}",this.id_jog)+"?run=1&progress_type="+this.progress_type+"&steps="+this.steps;
        
        let ndata = 
        { 
            params: JSON.stringify(data) 
        }

        if(this.btn_run_program)this.btn_run_program.classList.add("event-none");

        InduxsoftCrudlModel.InvokeService(endpoint, ndata,
            (data) => { window.location.reload(); },
            (error) => 
            { 
                if(this.spinner)this.spinner.classList.add("d-none");
                alert(error.message ?? JSON.stringify(error)); 
            },
        "PATCH", false);
    },
    checkProgramStatus(spinner, btn_run_program)
    {
        if (this.program_status >= 3) return;

        if(spinner)spinner.classList.remove("d-none");
        if(this.btn_run_program)this.btn_run_program.classList.add("event-none");

        fetch(this.url_get_program_status).then(response => response.json())
        .then(data => 
        {
            if (data.message) 
            {
                console.error(data.message);
                return;
            }

            spinner.classList.add("d-none");
            if(this.btn_run_program)this.btn_run_program.classList.remove("event-none");
            window.location.reload();
        });

        this.updateLogs();
    },
    updateLogs()
    {
        fetch(this.url_get_program_log).then(response => response.json())
        .then(data => 
        {
            if (data.message) 
            {
                console.error(data.message);
                return;
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    tuser.init();
    batch.init();
})