const user =
{
    formId:"", form:null, ff:null,

    init()
    {
        this.form = document.getElementById(this.formId);
        this.ff = this.form?.elements;

        const btn_submit = document.getElementById("btn-submit");
        const btn_pwd = document.getElementById("btn-save-pwd");
        
        btn_submit.addEventListener("click", () => InduxsoftCrudlModel.Submit(this.form));
        btn_pwd.addEventListener("click", () => this.changePwd());
    },

    changePwd()
    {
        const password = document.getElementById("new-pwd");
        const confirm = document.getElementById("try-pwd");

        let pwd1 = password.value.trim();
        let pwd2 = confirm.value.trim();

        if (pwd1 != pwd2) {
            alert("Las contraseñas no coinciden");
            return
        }

        let payload =
        {
            sys_pk:this.ff["sys_pk"].value,
            sys_recver:this.ff["sys_recver"].value,
            pwd: pwd1
        }

        InduxsoftCrudlModel.InvokeService("./", payload,
            (data) => {
                if (data.message) {
                    alert(data.message);
                    return
                }

                user.ff["sys_recver"].value = data.entity.sys_recver;
                password.value = "";
                confirm.value = "";
                main.closeModal('mdl-pwd');
                alert("Contraseña cambiada");
            },
            (error) => {
                alert(error.message ?? JSON.stringify(error));
            },
            "PATCH", false
        );
    }
}