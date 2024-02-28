var main = {
    init()
    {
        
    },
    url_encode(url)
    {
        let _url = btoa(url);
        
        _url = _url.replaceAll("=","|");
        _url = _url.replaceAll("/","_");
        _url = _url.replaceAll("+","-");
        
        return _url;
    },
    url_decode(url)
    {
        url = url.replaceAll("|","=");
        url = url.replaceAll("_","/");
        url = url.replaceAll("-","+");
        
        return atob(url);
    },
    getValues(containerId='', includeEmpy=false)
    {
        values = {};
        const controls = document.querySelectorAll(`#${containerId} input, #${containerId} select, #${containerId} textarea`);
        
        controls.forEach(control => 
        {
            if (values != null)
            {
                let v = '';

                if (control.id != 'inputv') v = control.value;
                else v = control.getAttribute('value');

                if (v.trim() == '' && control.getAttribute('required')=='true') {
                    alert('El campo: ' + control.name + ' es requerido');
                    control.focus();
                    values = null;
                }

                if (values && (control.getAttribute('type')??'').toLowerCase() == 'number' || ((control.getAttribute('hidden-type')??'') == 'number')) 
                    v = Number(v);

                if (values && (includeEmpy || v.toString().trim() != '')) values[control.name] = v;
            }
        });

        return values;
    },
    setValues(containerId='', obj)
    {
        const controls = document.querySelectorAll(`#${containerId} input, #${containerId} select, #${containerId} textarea`);
        controls.forEach(control => {
            control.value = (obj[control.name]??'');
        });
    },
    clearValues(containerId, includeHidden=false)
    {
        const controls = document.querySelectorAll(`#${containerId} input, #${containerId} select, #${containerId} textarea, #${containerId} input-key`);
        
        try
        {
            controls.forEach(control => {
                if (control.tagName.toLowerCase() != 'input-key') {
                    if(includeHidden || control.type != "hidden") control.value = '';
                }
                else control.clear();
            });
            return true;
        }
        catch(error)
        {
            alert(error);
            return false;
        }
    },
    openModal(modalId='')
    {
        this.getBSModal(modalId).show();
    },
    closeModal(modalId='')
    {
        this.getBSModal(modalId).hide();
    },
    getBSModal(modalId='')
    {
        const modalElement = document.getElementById(modalId);
        const bsModal = bootstrap.Modal.getInstance(modalElement);
        if (!bsModal) return new bootstrap.Modal(modalElement);

        return bsModal;
    },
    createFullElement(tagName="div", attributes={}, innerHTML='')
    {
        const elem = document.createElement(tagName);
        const keys = Object.keys(attributes);
        keys.forEach(key => elem.setAttribute(key, attributes[key]));
        if (innerHTML) elem.innerHTML = innerHTML;
        return elem;
    }
}
window.addEventListener('DOMContentLoaded', () => {
    main.init();
});