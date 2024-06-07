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
        this.setKeyboardShortcuts();
        this.setConfigTables();
        this.setTableEvents();

        const save_changes = document.querySelector('#save_changes');
        const undo_changes = document.querySelector('#undo_changes');

        if (save_changes) save_changes.addEventListener('click', e => this.saveVarsChanges());
        if (undo_changes) undo_changes.addEventListener('click', e => this.undoVarsChanges());

        this.setAjustPanelOneEvent();
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
                this.printCategoryInfo(this.categorySelected);
                this.getVarsFromCategory(this.categorySelected.id);
            }
            
            if ((this.tableCategories?.DataArray??[]).length > 0 ) 
            {
                this.tableCategories.NavTo(0,0);
            }
        }
    },
    setKeyboardShortcuts()
    {
        document.addEventListener("keydown", (e) => {
            // console.log("key: "+ e.key + " | " + "code: " + e.code);
            if (e.key === "Escape") {
                e.preventDefault();
                window.open("/","_top");
            }
            if (e.key === "F5") {
                e.preventDefault();
                window.location.reload();
            }
        });
    },
    setAjustPanelOneEvent()
    {
        const line = document.querySelector('#ajust_panel_one');
        if (line)
        {
            let pageX, panel, panelWidth;
            
            line.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
            }
            line.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                panel = e.target.parentElement;
                panel.style.transition = 'none';
                pageX = e.pageX;
                panelWidth = panel.offsetWidth;
            }
            document.onmousemove = (e) => {
                e.stopPropagation();
                if (panel) {
                    let diffX = (e.pageX - pageX);
                    panel.style.width = (panelWidth + diffX)+'px';
                }
            }
            document.onmouseup = (e) => {
                e.stopPropagation();
                if (panel) panel.style.transition = '.5s';
                panel = undefined;
                pageX = undefined;
                panelWidth = undefined;
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
                this.currentVars = success;
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
    printVars(vars)
    {
        const varsFormControls = document.querySelector('#varsFormControls');
        const varsEmpty = document.querySelector('#varsEmpty');

        if (vars)
        {
            varsFormControls.classList.remove('d-none');
            varsEmpty.classList.add('d-none');

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
            <div class="p-2">
                <small class="d-block mb-1 fw-5">${(varData.varcaption??'')}:</small>
                ${globalvar.getVarControl(varData)}
                <small class="fz-7 hint" class="d-block">${(varData.varhelp??'')}</small>
            </div>
        `
    },
    getVarControl(varData)
    {
        let control = null;
        const varInput = this.getJsonDef(varData.varinput) ?? {};
        const varValue = (varData.varvalue ?? '');
        const ctrlType = (varInput?.control ?? 'text');

        switch (ctrlType)
        {
            case "intcolor":
            case "hexcolor":
            {
                control = main.createFullElement('input',{
                    type: 'color',
                    value: varValue,
                    class: 'form-control form-control-color rounded-0',
                    pk: varData.sys_pk,
                }, varValue);
                break;   
            }
            case "time":
            {
                control = main.createFullElement('input',{
                    type: 'time',
                    value: varValue,
                    class: 'form-control rounded-0',
                    pk: varData.sys_pk,
                }, varValue);
                break;
            }
            case "date":
            {
                control = main.createFullElement('input',{
                    type: 'date',
                    value: varValue,
                    class: 'form-control rounded-0',
                    pk: varData.sys_pk,
                }, varValue);
                break;
            }
            case "datetime":
            {
                control = main.createFullElement('input',{
                    type: 'datetime-local',
                    value: varValue,
                    class: 'form-control rounded-0',
                    pk: varData.sys_pk,
                }, varValue);
                break;
            }
            case "memo":
            case "textarea":
            {
                control = main.createFullElement('textarea',{
                    class: 'form-control rounded-0',
                    pk: varData.sys_pk,
                }, varValue);
                break;
            }
            case "number":
            case "decimal":
            {
                control = main.createFullElement('input', { 
                    type:'number', 
                    value:varValue,
                    class:'induxsoft-form-control', 
                    pk:varData.sys_pk,
                }, varValue);
                break;
            }
            case "button":
            {
                const caption = varData.caption;
                control = main.createFullElement('a',{
                    href:varValue,
                    class:'btn btn-link border-primary card-link'
                }, caption);
                break;
            }
            case "select":
            {
                let type = varInput?.source?.type ?? 'list';
                let values = varInput?.source?.values ?? [];
                let query = varInput?.source?.query ?? '';
                let showfield = varInput?.source?.showfield ?? '';
                let keyfield = varInput?.source?.keyfield ?? '';
                
                let idElement = "select-"+type+"-"+varData.sys_pk;

                control = main.createFullElement('select',{
                    class: 'form-select rounded-0',
                    id: idElement,
                    pk: varData.sys_pk,
                });

                const fillSelect = (data) => {
                    data.forEach(itm => {
                        const option = document.createElement('option');
                        option.value = itm[keyfield];
                        option.text = itm[showfield];
                        if (itm[keyfield] == varValue) option.setAttribute("selected","");
                        
                        control.appendChild(option);
                    });
                }

                if (type === "query")
                {
                    let url = "./?_view=load-values&cmd=" + main.url_encode(query);
                    fetch(url).then(response => response.json())
                        .then(data => fillSelect(data))
                        .finally(() => {
                            const element = document.getElementById(idElement);
                            if (element) element.innerHTML = control.innerHTML;
                        });
                }
                else fillSelect(values);

                break;
            }
            default:
            {
                control = main.createFullElement('input', { 
                    type:'text', 
                    class:'induxsoft-form-control', 
                    pk:varData.sys_pk, 
                    value:varValue,
                }, varValue);

                if (varValue) control.value = varValue;
                break;
            }
        }

        control.classList.add('show-hint', 'var-control');
        return control.outerHTML;
    },
    getJsonDef(string)
    {
        let definition = null;
        try {
            definition = JSON.parse(string);
        } catch (error) {/*ignore*/}
        return definition;
    },
    setVarChangeEvent()
    {
        const appyEvent = (control) =>
        {
            // const type = control.getAttribute('typeEvent');
            switch (control.tagName.toLowerCase())
            {
                case "input":
                {
                    let Events =
                    {
                        number: "change",
                        text: "keyup",
                        color: "change",
                        time: "change",
                        date: "change",
                        "datetime-local": "change",
                    }

                    let event = Events[control.type];
                    control.addEventListener(event, e => { this.updateVarValue(control.getAttribute('pk'), control.value) });
                    break;
                }
                case "textarea":
                {
                    control.addEventListener('keyup', e => { this.updateVarValue(control.getAttribute('pk'), control.value) });
                    break;
                }
                case "select":
                {
                    control.addEventListener('change', e => { this.updateVarValue(control.getAttribute('pk'), control.value) });
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
        this.printVars(this.currentVars);
    },
    saveVarsChanges()
    {
        let data = {
            vars: this.getmodifiedVars()
        }

        let endpoint = this.url.replace('@id',this.categorySelected.id);
       
        InduxsoftCrudlModel.InvokeService(endpoint, data,
            success => {
                this.setNewValues(success);
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
    setNewValues(data)
    {
        if(!this.currentVars)return;
        if(!data)return;

        for (let i = 0; i < this.currentVars.length; i++) 
        {
            const _var = this.currentVars[i];
            var newdata=data.find(d=>d.sys_pk==_var.sys_pk);
            if(newdata)
            {
                _var.sys_recver=newdata.sys_recver;
                break;
            }
        }
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