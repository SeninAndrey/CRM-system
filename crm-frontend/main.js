'use strict';
const addClientBtn = document.getElementById("addClientBtn");
const MAIN_URL = "http://localhost:3000/api/clients";
const inputSearch = document.getElementById("input__search");
const tableHeaders = document.querySelectorAll('th');
let timeID = null;
let modalTimer = null;
let loadingTimer = null;

addClientBtn.addEventListener('click', () => {
    document.body.append(createModalNew());
    clearTimeout(modalTimer);
    modalTimer = setTimeout(showModal, 0);
})

// появление модального окна
function showModal() {
    const modalWindow = document.getElementById("modal-window");
    modalWindow.classList.add('modal__show');
}

// функция фильтра
async function searchFunc() {
    const table = document.querySelector('.table__main');
    table.style.height = '300px';
    const preloader = document.querySelector('.preloader');
    preloader.classList.add('preloader__show');
    const searchQuery = inputSearch.value.toLowerCase();
    const searchList = await loadClientList(searchQuery);
    createTable('table__body', searchList);
    preloader.classList.remove('preloader__show');
}

// ожидание завершения ввода запроса поиска
inputSearch.addEventListener('input', function() {
    clearTimeout(timeID);
    timeID = setTimeout(searchFunc, 500)
})

// функция создания элемента
const createElem = (tag, styles, atributs, text) => {
    const el = document.createElement(tag),
        artrbs = Object.entries(atributs);
    for (const style of styles) {
        el.classList.add(style)
    };
    artrbs.forEach(([key, value]) => {
        el.setAttribute(key, value)
    });
    el.textContent = text;
    el.placeholder = text;
    return el;
}

// функция проверки количества контактов в модальном окне
const checkNumberOfContacts = () => {
    const contactsList = document.querySelectorAll('ul.form-contacts__contacts-list > li');
    const result = (contactsList.length <= 9) ? true : false;
    return result
}

// создание модального окна изменения данных клиента
async function createModalEdit(id) {
    const currentClient = await getClientItem(id);
    const modalElement = createElem('div', ['modal'], { 'id': 'modal' }, ''),
        overlay = createElem('div', ['overlay'], { 'id': "modal__overlay" }, ''),
        modalWindow = createElem('div', ['modal__window'], { 'id': 'modal-window' }, ''),
        modalHeader = createElem('h2', ['modal__header', 'modal__header-edit'], {}, 'Изменить данные'),
        modalHeaderID = createElem('span', ['modal__header-id'], {}, 'ID: ' + id),
        modalCloseBtn = createElem('button', ['btn', 'modal__close'], {}, ),
        modalForm = createElem('form', ['modal__form'], {}, ''),
        formSurname = createElem('input', ['modal__input', 'modal__input-edit'], { 'id': "modal__surname" }, ''),
        formName = createElem('input', ['modal__input', 'modal__input-edit'], { 'id': "modal__name" }, ''),
        formLastName = createElem('input', ['modal__input', 'modal__input-edit'], { 'id': "modal__lastname" }, ''),
        formSurnameLabel = createElem('label', ['modal__label-form'], { 'for': "modal__surname" }, 'Фамилия'),
        formNameLabel = createElem('label', ['modal__label-form'], { 'for': "modal__name" }, 'Имя'),
        formLastNameLabel = createElem('label', ['modal__label-form'], { 'for': "modal__lastname" }, 'Отчество'),
        formContacts = createElem('div', ['modal__form-contacts'], {}, ''),
        formSubmitBtn = createElem('button', ['btn', 'modal__btn'], {}, 'Сохранить'),
        formContactsList = createElem('ul', ['form-contacts__contacts-list'], {}, ''),
        formContactsAddBtn = createElem('button', ['btn', 'modal-btn__add-contact'], {}, 'Добавить контакт'),
        modalDeleteBtn = createElem('button', ['btn', 'modal__btn-cancel'], {}, 'Удалить клиента'),
        errorsMessage = createElem('p', ['modal__errors', 'modal__errors__disabled'], {}, 'Ошибка: ');

    formName.value = currentClient[1].name;
    formSurname.value = currentClient[1].surname;
    formLastName.value = currentClient[1].lastName;
    const contacts = currentClient[1].contacts;
    contacts.forEach((contactItem) => {
        formContactsList.append(addContactToModal(contactItem.type, contactItem.value));
        formContacts.classList.add('form-contacts__contacts-list__padding');
    })
    modalDeleteBtn.addEventListener('click', async() => {
        if (await checkCurrentClient(id)) {
            removeModalElem();
            document.body.append(createModalDelete(id));
            clearTimeout(modalTimer);
            modalTimer = setTimeout(showModal, 0);
        } else {
            onClose();
        }
    })
    modalCloseBtn.addEventListener('click', () => {
        onClose();
    })
    formContactsAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        formContacts.classList.add('form-contacts__contacts-list__padding');
        let contactsItem = addContactToModal();
        formContactsList.append(contactsItem);
        if (!checkNumberOfContacts()) { formContactsAddBtn.disabled = true; }
    })
    modalForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        // валидация формы
        let contactsList = document.querySelectorAll('li.form-contact__contact-item > input');
        contactsList.forEach((contactItem) => {
            if (contactItem.value.trim() === '') {
                contactItem.value = '';
                contactItem.classList.add('contact-item__input__error');
            }
        })
        errorsMessage.innerHTML = 'Ошибка: ';
        if (formSurname.value.trim() === '') {
            formSurname.placeholder = 'Фамилия';
            formSurname.classList.remove('modal__input-edit');
            formSurname.classList.add('modal__input__error');
        }
        formSurname.addEventListener('focus', () => {
            formSurname.placeholder = '';
            formSurname.classList.remove('modal__input__error');
        })
        if (formName.value.trim() === '') {
            formName.placeholder = 'Имя';
            formName.classList.remove('modal__input-edit');
            formName.classList.add('modal__input__error');
        }
        formName.addEventListener('focus', () => {
            formName.placeholder = '';
            formName.classList.remove('modal__input__error');
        })

        const currentTableRow = document.getElementById(id);
        modalWindow.classList.add('modal__disabled');
        const currentClient = await editClientItem(id, formName.value, formSurname.value, formLastName.value, getContactsFromModal());

        // проверяем статус ответа функции создания клиента
        if (currentClient[0]) {
            // в случае успешного ответа(response.ok) отрисовываем новую сторку в таблице на основани полученного ответа функции
            const updatedAt = new Date();
            const table = document.getElementById('tableData');
            const tableNewRow = createTableItem(id, formName.value, formSurname.value, formLastName.value, currentClient[1].createdAt, updatedAt, getContactsFromModal());
            onClose();
            currentTableRow.remove();
            table.append(tableNewRow);
        } else {
            // в случае не успешногно ответа(!response.ok) отрисовываем список ошибок в модальное окно
            if (await checkCurrentClient(id)) {
                modalWindow.classList.remove('modal__disabled');
                formContacts.classList.add('modal__form-contacts__error');
                errorsMessage.classList.remove('modal__errors__disabled');
                currentClient[1].errors.forEach((error) => {
                    errorsMessage.innerHTML += ' ' + error.message;
                })
            } else {
                onClose();
            }
        }
    })
    overlay.addEventListener('click', () => {
        onClose();
    })

    modalHeader.append(modalHeaderID);
    modalWindow.append(modalHeader, modalCloseBtn);
    modalForm.append(formSurnameLabel, formSurname, formNameLabel, formName, formLastNameLabel, formLastName, formContacts, errorsMessage, formSubmitBtn);
    formContacts.append(formContactsList, formContactsAddBtn);
    modalWindow.append(modalForm, modalDeleteBtn);
    modalElement.append(modalWindow, overlay);
    return modalElement;
}

// создание модального окна добавления клиента
function createModalNew() {
    const modalElement = createElem('div', ['modal'], { 'id': 'modal' }, ''),
        overlay = createElem('div', ['overlay'], {}, ''),
        modalWindow = createElem('div', ['modal__window'], { 'id': 'modal-window' }, ''),
        modalHeader = createElem('h2', ['modal__header', 'modal__header-edit'], {}, 'Новый клиент'),
        modalCloseBtn = createElem('button', ['btn', 'modal__close'], {}, ),
        modalForm = createElem('form', ['modal__form'], {}, ''),
        formSurname = createElem('input', ['modal__input'], { 'id': "modal__surname" }, 'Фамилия'),
        formName = createElem('input', ['modal__input'], { 'id': "modal__name" }, 'Имя'),
        formLastName = createElem('input', ['modal__input'], { 'id': "modal__lastname" }, 'Отчество'),
        formContacts = createElem('div', ['modal__form-contacts'], {}, ''),
        formContactsList = createElem('ul', ['form-contacts__contacts-list'], {}, ''),
        formSubmitBtn = createElem('button', ['btn', 'modal__btn'], {}, 'Сохранить'),
        formContactsAddBtn = createElem('button', ['btn', 'modal-btn__add-contact'], {}, 'Добавить контакт'),
        modalCancelBtn = createElem('button', ['btn', 'modal__btn-cancel'], {}, 'Отмена'),
        errorsMessage = createElem('p', ['modal__errors', 'modal__errors__disabled'], {}, 'Ошибка: ');

    modalCancelBtn.addEventListener('click', () => {
        onClose();
    })
    modalCloseBtn.addEventListener('click', () => {
        onClose();
    })
    formContactsAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        formContacts.classList.add('form-contacts__contacts-list__padding');
        let contactsItem = addContactToModal();
        formContactsList.append(contactsItem);
        if (!checkNumberOfContacts()) { formContactsAddBtn.disabled = true; }
    })
    formSubmitBtn.addEventListener('click', async(e) => {
        e.preventDefault();
        // валидация формы
        let contactsList = document.querySelectorAll('li.form-contact__contact-item > input');
        contactsList.forEach((contactItem) => {
            if (contactItem.value.trim() === '') {
                contactItem.value = '';
                contactItem.classList.add('contact-item__input__error');
            }
        })
        errorsMessage.innerHTML = 'Ошибка: ';
        if (formSurname.value.trim() === '') {
            formSurname.classList.add('modal__input__error');
        }
        formSurname.addEventListener('focus', () => {
            formSurname.classList.remove('modal__input__error');
            formSurname.placeholder = 'Фамилия';
        })
        if (formName.value.trim() === '') {
            formName.classList.add('modal__input__error');
        }
        formName.addEventListener('focus', () => {
            formName.classList.remove('modal__input__error');
            formName.placeholder = 'Имя';
        })
        modalWindow.classList.add('modal__disabled');
        const newClient = await createClient(formSurname.value, formName.value, formLastName.value, getContactsFromModal());
        // проверяем статус ответа функции создания клиента
        if (newClient[0]) {
            // в случае успешного ответа(response.ok) отрисовываем новую сторку в таблице на основани полученного ответа функции
            const createdAt = new Date();
            const table = document.getElementById('tableData');
            const tableNewRow = createTableItem(newClient[1].id, formName.value, formSurname.value, formLastName.value, createdAt, createdAt, getContactsFromModal());
            onClose();
            table.append(tableNewRow);
        } else {
            // в случае не успешногно ответа(!response.ok) отрисовываем список оибок в модльное окно
            modalWindow.classList.remove('modal__disabled');
            formContacts.classList.add('modal__form-contacts__error');
            errorsMessage.classList.remove('modal__errors__disabled');
            newClient[1].errors.forEach((error) => {
                errorsMessage.innerHTML += ' ' + error.message;
            })
        }
    })
    overlay.addEventListener('click', () => {
        onClose();
    })

    modalWindow.append(modalHeader, modalCloseBtn);
    modalForm.append(formSurname, formName, formLastName);
    formContacts.append(formContactsList, formContactsAddBtn);
    modalForm.append(formContacts, errorsMessage, formSubmitBtn);
    modalWindow.append(modalForm, modalCancelBtn);
    modalElement.append(modalWindow, overlay);
    return modalElement;
}

// функция получения списка контактов из формы модального окна
function getContactsFromModal() {
    const contactsList = document.querySelectorAll('ul.form-contacts__contacts-list > li');
    let contactsFromModal = [];
    contactsList.forEach((contactItem) => {
        const contactType = contactItem.childNodes[0].value;
        const contactValue = contactItem.childNodes[1].value;
        const contactItemResult = {
            type: contactType,
            value: contactValue
        }
        contactsFromModal.push(contactItemResult);
    })
    return contactsFromModal;
}

// функция добавления строки контакта в модальном окне
function addContactToModal(contactType, contactValue) {
    const contactItemModal = createElem('li', ['form-contact__contact-item'], {}, ''),
        contactItemSelect = createElem('select', ['contact-item__select'], {}, ''),
        contactSelectOptionPhone = createElem('option', ['contact-item__option'], { 'value': "tel" }, 'Телефон'),
        contactSelectOptionEmail = createElem('option', ['contact-item__option'], { 'value': "email" }, 'Email'),
        contactSelectOptionVK = createElem('option', ['contact-item__option'], { 'value': "vk" }, 'Vk'),
        contactSelectOptionFB = createElem('option', ['contact-item__option'], { 'value': "fb" }, 'Facebook'),
        contactSelectOptionOtherContact = createElem('option', ['contact-item__option'], { 'value': "other_contact" }, 'Другое'),
        contactItemCloseBtn = createElem('button', ['btn', 'contact-item__close-btn'], {}, ''),
        contactItemCloseBtnIcon = createElem('span', ['contact-item__btn-icon'], {}, ''),
        contactDeleteBtnTooltip = createElem('div', ['contacts-list__item-tooltip'], {}, 'Удалить контакт'),
        contactItemInput = createElem('input', ['contact-item__input'], {}, 'Введите данные контакта');

    contactItemCloseBtn.append(contactItemCloseBtnIcon, contactDeleteBtnTooltip);
    contactItemInput.value = (contactValue !== undefined) ? contactValue : '';
    contactItemSelect.append(contactSelectOptionPhone, contactSelectOptionEmail, contactSelectOptionVK, contactSelectOptionFB, contactSelectOptionOtherContact);
    contactItemModal.append(contactItemSelect, contactItemInput);

    const options = contactItemSelect.querySelectorAll('option');
    options.forEach((option) => {
        if (option.value === contactType) {
            option.setAttribute('selected', "true");
        }
    })

    if (contactValue !== undefined) {
        contactItemInput.classList.add('contact-item__input__content');
        contactItemModal.append(contactItemCloseBtn);
    }

    contactItemInput.addEventListener('focus', function() {
        contactItemInput.classList.add('contact-item__input__content');
        contactItemInput.classList.remove('contact-item__input__error');
        contactItemModal.append(contactItemCloseBtn)
    });

    contactItemCloseBtn.addEventListener('click', () => {
        contactItemModal.remove();
        document.querySelector('.modal-btn__add-contact').disabled = false;
        const contactsList = document.querySelectorAll('ul.form-contacts__contacts-list > li');
        if (contactsList.length === 0) {
            const formContacts = document.querySelector('.form-contacts__contacts-list__padding');
            formContacts.classList.remove('form-contacts__contacts-list__padding');
        }
    });
    return contactItemModal;
}

// создание модального окна удаления клиента
function createModalDelete(client) {
    const modalElement = createElem('div', ['modal'], { 'id': 'modal' }, ''),
        overlay = createElem('div', ['overlay'], {}, ''),
        modalWindow = createElem('div', ['modal__window', 'modal__window-delete'], { 'id': "modal-window" }, ''),
        modalHeader = createElem('h2', ['modal__header'], {}, 'Удалить клиента'),
        modalCloseBtn = createElem('button', ['btn', 'modal__close'], {}, ),
        modalConfirm = createElem('p', ['modal__text'], {}, 'Вы действительно хотите удалить данного клиента?'),
        modalDeleteBtn = createElem('button', ['btn', 'modal__btn'], {}, 'Удалить'),
        modalCancelBtn = createElem('button', ['btn', 'modal__btn-cancel'], {}, 'Отмена');

    modalDeleteBtn.addEventListener('click', () => {
        const currentTableRow = document.getElementById(client);
        deleteClientItem(client);
        onClose();
        currentTableRow.remove();
    })
    modalCancelBtn.addEventListener('click', () => {
        onClose();
    })
    modalCloseBtn.addEventListener('click', () => {
        onClose();
    })
    overlay.addEventListener('click', () => {
        onClose();
    })

    modalWindow.append(modalHeader, modalCloseBtn, modalConfirm, modalDeleteBtn, modalCancelBtn);
    modalElement.append(modalWindow, overlay);
    return modalElement;
}

// закрытие модального окна
function onClose() {
    window.history.back();
    const modalWindow = document.getElementById("modal-window");
    clearTimeout(modalTimer);
    modalWindow.classList.remove('modal__show');
    modalTimer = setTimeout(removeModalElem, 350);
}

// функция удаления элмента модального окна из DOM
function removeModalElem() {
    const modalWindow = document.getElementById("modal");
    modalWindow.remove();
}

// разделяем и преобразуем дату/время
function separateDateTime(dateTime) {
    const date = new Date(dateTime),
        yyyy = date.getFullYear(),
        mm = (date.getMonth() < 9) ? ('0' + (date.getMonth() + 1)) : (date.getMonth() + 1),
        dd = (date.getDate() < 10) ? ('0' + date.getDate()) : date.getDate(),
        hh = (date.getHours() < 10) ? ('0' + date.getHours()) : date.getHours(),
        min = (date.getMinutes() < 10) ? ('0' + date.getMinutes()) : date.getMinutes(),

        dateResult = dd + '.' + mm + '.' + yyyy,
        timeResult = hh + ':' + min;
    return { dateResult, timeResult };
}

// получение списка клиентов
async function loadClientList(searchQuery) {
    const url = (searchQuery === undefined) ? MAIN_URL : (MAIN_URL + '?search=' + searchQuery);
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// создание одного элемента списка контактов с тултипом 
function CreateContactElem(contactType, tooltipText) {
    const contactsListItem = createElem('li', ['btn', 'contacts-list__item'], {}, '');
    const contactItemIcon = createElem('span', ['contacts-list__item-img', contactType], {}, '');
    const contactItemtooltip = createElem('div', ['contacts-list__item-tooltip'], {}, tooltipText);

    contactsListItem.append(contactItemIcon, contactItemtooltip);
    return contactsListItem;
}

// получение и отрисовка списка контактов клиента в таблице 
function createContactsTable(inputData) {
    const contacts = inputData;
    const contactsList = createElem('ul', ['table__contacts-list'], {}, '');
    let iconType = '';

    contacts.forEach((contactItem) => {
        const contactType = Object.values(contactItem)[0];
        let contactValue = Object.values(contactItem)[1];
        switch (contactType) {
            case 'tel':
                iconType = 'tel__img';
                contactValue = '+7' + ' (' + contactValue.substr(1, 3) + ') ' + contactValue.substr(4, 3) + '-' + contactValue.substr(7, 2) + '-' + contactValue.substr(9, 2);
                break;
            case 'email':
                iconType = 'email__img';
                break;
            case 'vk':
                iconType = 'vk__img';
                break;
            case 'fb':
                iconType = 'fb__img';
                break;
            default:
                iconType = 'other-contact__img';
                break;
        }
        const contactElement = CreateContactElem(iconType, contactValue);
        contactsList.append(contactElement);
    });
    return contactsList;
}

// добавление нового клиента
async function createClient(newSurname, newName, newLastname, newContacts) {
    const response = await fetch(MAIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            surname: newSurname,
            name: newName,
            lastName: newLastname,
            contacts: newContacts
        })
    })
    const data = await response.json();
    return [response.ok, data];
}

// получение клиента по его ID
async function getClientItem(idClient) {
    const response = await fetch(MAIN_URL + '/' + idClient);
    const data = await response.json();
    return [response.ok, data];
}

// изменение клиента по его ID
async function editClientItem(idClient, newName, newSurname, newLastName, newContacts) {
    const response = await fetch(MAIN_URL + '/' + idClient, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            surname: newSurname,
            name: newName,
            lastName: newLastName,
            contacts: newContacts
        })
    });
    const data = await response.json();
    return [response.ok, data];
}

// уделение клиента по его ID
async function deleteClientItem(idClient) {
    const response = await fetch(MAIN_URL + '/' + idClient, {
        method: 'DELETE',
    });
    const data = await response.json();
}

// функция прoверки наличия текущего клиента на сервере
async function checkCurrentClient(id) {
    const currentClient = await getClientItem(id);
    if (!currentClient[0]) {
        alert('КЛИЕНТ НЕ НАЙДЕН!');
        createTable('table__body');
        return false;
    } else {
        return true;
    }
}

// функция сортировки:
// 1. направление сортировки
const sortDirection = Array.from(tableHeaders).map(function(header) {
        return '';
    })
    // 2. пробразуем ячейку с датой, временем в удобную для сортировки строку
function dateToString(dateTime) {
    const dateTimeString = dateTime
        .replace('<span class="table__item-date">', '')
        .replace('</span><span class="table__item-time">', ' ')
        .replace('</span>', '');
    const yyyy = dateTimeString.slice(6, 10);
    const mm = dateTimeString.slice(3, 5);
    const dd = dateTimeString.slice(0, 2);
    const hh = dateTimeString.slice(11, 13);
    const min = dateTimeString.slice(14, 16);
    const dateTimeResult = yyyy + mm + dd + hh + min;
    return dateTimeResult;
}
// 3. преобразование содержимого ячейки в столбце (только для ячеек с датой/временем)
function transform(index, content) {
    const type = tableHeaders[index].getAttribute('data-type');
    switch (type) {
        case 'date_time':
            return dateToString(content);
        default:
            return content;
    }
}
// 4. функция сортировки
function sortColumn(index) {
    const tableBody = document.querySelector('tbody');
    const rows = tableBody.querySelectorAll('tr');
    const currentHeader = tableHeaders[index];
    const direction = sortDirection[index] || 'asc';
    const multiplier = (direction === 'asc') ? -1 : 1;
    const newRows = Array.from(rows);
    const abcDirection = document.querySelector("span.sort-fio");

    newRows.sort(function(rowA, rowB) {
        // содержимое ячеек
        const cellA = rowA.querySelectorAll('td')[index].innerHTML;
        const cellB = rowB.querySelectorAll('td')[index].innerHTML;
        // преобразуем содержимое в ячейках с датой, временем
        const cellAtransformed = transform(index, cellA);
        const cellBtransformed = transform(index, cellB);

        switch (true) {
            case cellAtransformed > cellBtransformed:
                return 1 * multiplier;
            case cellAtransformed < cellBtransformed:
                return -1 * multiplier;
            case cellAtransformed === cellBtransformed:
                return 0;
        }
    });
    // отрисовка стрелочки направления сортировки 
    if (direction === 'asc') {
        sortDirection[index] = 'desc';
        currentHeader.classList.remove('sort-asc');
        currentHeader.classList.add('sort-desc');
        abcDirection.innerHTML = (index === 1) ? 'Я-А' : '';
    } else {
        sortDirection[index] = 'asc';
        currentHeader.classList.add('sort-asc');
        currentHeader.classList.remove('sort-desc');
        abcDirection.innerHTML = (index === 1) ? 'А-Я' : '';
    }
    // перерисоывываем таблицу отсортированными строками
    tableBody.innerHTML = '';
    newRows.forEach(function(newRow) {
        tableBody.appendChild(newRow);
    })
}

// создание одной строки таблицы
const createTableItem = (id, name, surname, lastname, created, modified, contacts) => {
    const tableRow = createElem('tr', ['table__row'], { 'id': id }, ''),
        tableID = createElem('td', ['table__item', 'table__id'], {}, id),
        tableFIO = createElem('td', ['table__item', 'table__fio'], {}, surname + ' ' + name + ' ' + lastname),
        tableCreated = createElem('td', ['table__item', 'table__created'], {}, ''),
        tableModified = createElem('td', ['table__item', 'table__modified'], {}, ''),
        tableCreatedDate = createElem('span', ['table__item-date'], {}, separateDateTime(created).dateResult),
        tableCreatedTime = createElem('span', ['table__item-time'], {}, separateDateTime(created).timeResult),
        tableModifiedDate = createElem('span', ['table__item-date'], {}, separateDateTime(modified).dateResult),
        tableModifiedTime = createElem('span', ['table__item-time'], {}, separateDateTime(modified).timeResult),
        tableContacts = createElem('td', ['table__item', 'table__contacts'], {}, ''),
        tableActions = createElem('td', ['table__item', 'table__actions'], {}, ''),
        tableEditBtn = createElem('span', ['btn', 'table__edit'], {}, 'Изменить'),
        tableDeleteBtn = createElem('span', ['btn', 'table__delete', 'table__delete-icon'], {}, 'Удалить');
    const contactsListElem = createContactsTable(contacts);

    tableDeleteBtn.addEventListener('click', async() => {
        if (await checkCurrentClient(id)) {
            document.body.append(createModalDelete(id));
            clearTimeout(modalTimer);
            modalTimer = setTimeout(showModal, 0);
        }
    })
    tableEditBtn.addEventListener('click', async() => {
        if (await checkCurrentClient(id)) {
            tableEditBtn.classList.add('table__icon__loading');
            location.href += '#' + id;
            document.body.append(await createModalEdit(id));
            clearTimeout(modalTimer);
            modalTimer = setTimeout(showModal, 0);
            tableEditBtn.classList.remove('table__icon__loading');
        }
    })
    tableCreated.append(tableCreatedDate, tableCreatedTime);
    tableModified.append(tableModifiedDate, tableModifiedTime);
    tableActions.append(tableEditBtn, tableDeleteBtn);
    tableContacts.append(contactsListElem);
    tableRow.append(tableID, tableFIO, tableCreated, tableModified, tableContacts, tableActions);
    return tableRow;
}

// создание таблицы. inputList - список на входе в функцию(если он есть)
const createTable = async(tableContainer, inputList) => {
    const table = document.getElementById(tableContainer);
    table.style.height = '300px';
    let tableList = createElem('div', [], { 'id': 'tableData' }, '');

    table.innerHTML = '';

    const preloader = document.querySelector('.preloader');
    preloader.classList.add('preloader__show');
    // проверка наличия входного списка
    const appData = (inputList !== undefined) ? (inputList) : (await loadClientList());
    appData.forEach((client) => {
        const tableItem = createTableItem(client.id, client.name, client.surname, client.lastName, client.createdAt, client.updatedAt, client.contacts);
        tableList.append(tableItem);
    });
    table.style.height = '0';
    preloader.classList.remove('preloader__show');
    table.append(tableList);
    // дополнительное задание 2(отрисовка формы изменения клиента, если в адресной строке после символа # идет ID клиента)
    if (location.href.includes('#')) {
        const id = location.href.split('#')[1];
        document.body.append(await createModalEdit(id));
        showModal();
    }
    // сортировка
    [].forEach.call(tableHeaders, function(header, index) {
        header.addEventListener('click', function() {
            tableHeaders.forEach((header) => {
                header.classList.remove('sort-asc', 'sort-desc');
            })
            sortColumn(index);
        })
    })

}