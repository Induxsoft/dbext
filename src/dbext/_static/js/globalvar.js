var globalvar =
{
    tableCategories:null, tableCId:'', url:'',
    categorySelected:null, currentVars: null, currentVarsBackup:null,
    typeEvents: {
        inputText: 1,
        select: 2
    },

    // =============== INIT

    init()
    {
        this.tableCategories = document.querySelector('#'+this.tableCId);
        this.setConfigTables();
        this.setTableEvents();

        const save_changes = document.querySelector('#save_changes');
        const undo_changes = document.querySelector('#undo_changes');

        if (save_changes) save_changes.addEventListener('click', e => this.saveVarsChanges());
        if (undo_changes) undo_changes.addEventListener('click', e => this.undoVarsChanges());
    },
    setConfigTables()
    {
        if (this.tableCategories)
        {
            this.tableCategories.AutoAddRow = false;
            this.tableCategories.AutoDelRow = false;
            this.tableCategories.EverMove = false;
        }
    },
    setTableEvents()
    {
        if (this.tableCategories)
        {
            this.tableCategories.Events[this.tableCategories.EdiTable.Const.Events.BeforeCellFocus] = (e) =>
            {
                if (this.isDirtyVars()) {
                    if (!confirm('Se han realizado modificaciones en la configuración de la categoría actual. ¿Desea descartar los cambios?'))
                        e.cancel = true;
                }
            }
            this.tableCategories.Events[this.tableCategories.EdiTable.Const.Events.EnterCell] = (e) =>
            {
                this.categorySelected = this.tableCategories.DataArray[e.sender.CurrentRowIndex()];
                //this.printCategoryInfo(this.categorySelected);
                this.getVarsFromCategory(this.categorySelected.id);
            }
            if ((this.tableCategories?.DataArray??[]).length > 0) {
                this.tableCategories.NavTo(0,0);
            }
        }
    },

    // =============== CATEGORY

    printCategoryInfo(data)
    {
        const categoryInfo = document.querySelector('#categoryInfo');

        if (data)
        {
            categoryInfo.innerHTML = `
                <div class="group-box-info"><small class="fw-5">ID</small><p class="m-0">${data.id??''}</p></div>
                <div class="group-box-info"><small class="fw-5">Título</small><p class="m-0">${data.caption??''}</p></div>
                <div class="group-box-info"><small class="fw-5">Detalle</small><p class="m-0">${data.help??''}</p></div>
            `;
        }
        else
        {
            categoryInfo.innerHTML = '<small class="text-secondary">No hay información de la categoría especificada.</small>';
        }
    },

    // =============== VARS

    getVarsFromCategory(categoryId)
    {
        let endpoint = this.url.replace('@id',categoryId);

        InduxsoftCrudlModel.InvokeService(endpoint, null,
            success => {
                this.currentVars = (success.vars??[]);
                this.currentVarsBackup = JSON.parse(JSON.stringify(this.currentVars));
                this.printVars(success);
            },
            failure => { 
                this.printVars(null);
                alert('No se pudo obtener información de la categoría especificada.\n'+JSON.stringify(failure));
            },
            "GET", false
        );
    },
    printVars(varsData)
    {
        this.printCategoryInfo(varsData);
        const varsFormControls = document.querySelector('#varsFormControls');
        const varsEmpty = document.querySelector('#varsEmpty');

        if (varsData)
        {
            varsFormControls.classList.remove('d-none');
            varsEmpty.classList.add('d-none');

            let vars = (varsData.vars??[]);
            let tmpl = ``;

            vars.forEach(v => {
                if (v) tmpl += globalvar.getBlockControl(v);
            });

            varsFormControls.innerHTML = ((vars.length > 0) ? tmpl : '<small class="text-secondary">Sin variables de configuración.</small>');
            this.setVarChangeEvent();
        }
        else
        {
            varsFormControls.classList.add('d-none');
            varsEmpty.classList.remove('d-none');
        }
    },
    getBlockControl(varData)
    {
        return `
            <div class="p-3">
                <small class="d-block mb-1 fw-5">${(varData.varcaption??'')}:</small>
                ${globalvar.getVarControl(varData)}
                <small class="fz-7 hint" class="d-block">${(varData.varhelp??'')}</small>
            </div>
        `
    },
    getVarControl(varData)
    {
        let control = null;
        const varInput = (varData.varinput??'default');
        const varValue = (varData.varvalue??'');

        switch (varInput)
        {
            case "default":
            default:
            {
                control = main.createFullElement('input', { 
                    type:'text', 
                    class:'induxsoft-form-control', 
                    pk:varData.sys_pk, 
                    value:varValue,
                    typeEvent: this.typeEvents.inputText
                }, varValue);

                if (varValue) control.value = varValue;
                break;
            }
        }

        control.classList.add('show-hint', 'var-control');
        return control.outerHTML;
    },
    setVarChangeEvent()
    {
        const appyEvent = (control) =>
        {
            const type = control.getAttribute('typeEvent');
            switch (type)
            {
                case this.typeEvents.select:
                {
                    control.addEventListener('change', e => { this.updateVarValue(control.getAttribute('pk'), control.value) });
                    break;
                }
                case this.typeEvents.inputText:
                default:
                {
                    control.addEventListener('keyup', e => { this.updateVarValue(control.getAttribute('pk'), control.value) });
                    break;
                }
            }
        }
        document.querySelectorAll('.var-control').forEach(control => {
            appyEvent(control);
        });
    },
    updateVarValue(var_pk, newValue)
    {
        console.log('pk: ' + var_pk);
        console.log('new value: ' + newValue);
        let _var = this.currentVars.find(v => v.sys_pk == var_pk);
        if (_var) _var.varvalue = newValue;
        this.showVarSaveControls();
    },
    isDirtyVars()
    {
        return (JSON.stringify(this.currentVars) !== JSON.stringify(this.currentVarsBackup));
    },
    showVarSaveControls()
    {
        const save_vars = document.querySelector('#save_changes');
        const undo_vars = document.querySelector('#undo_changes');
        const is_dirty = this.isDirtyVars();
        save_vars.classList.toggle('d-none', !is_dirty);
        undo_vars.classList.toggle('d-none', !is_dirty);
    },
    undoVarsChanges()
    {
        this.currentVars = JSON.parse(JSON.stringify(this.currentVarsBackup));
        this.showVarSaveControls();
    },
    saveVarsChanges()
    {
        let data = {
            vars: this.getmodifiedVars()
        }

        let endpoint = this.url.replace('@id',this.categorySelected.id);

        InduxsoftCrudlModel.InvokeService(endpoint, data,
            success => {
                console.log(success);
                this.currentVarsBackup = JSON.parse(JSON.stringify(this.currentVars));
                this.showVarSaveControls();
            },
            failure => { 
                console.log(failure);
                alert('No fue posible guardar la configuración.\n'+JSON.stringify(failure));
            },
            "POST", false
        );

    },
    getmodifiedVars()
    {
        let list = [];
        this.currentVarsBackup.forEach(_varb => {
            let _var = this.currentVars.find(v => v.sys_pk == _varb.sys_pk);
            if (_var && _var.varvalue != _varb.varvalue)
                list.push({
                    sys_pk:_var.sys_pk,
                    sys_recver:_var.sys_recver,
                    varvalue: _var.varvalue
                });
        });
        return list;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalvar.init();
});