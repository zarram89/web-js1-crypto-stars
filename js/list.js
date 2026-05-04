import { formatCurrency } from './utils.js';
import { openModal } from './modal.js';

const tableBody = document.querySelector('.users-list__table-body');
const rowTemplate = document.querySelector('#user-table-row__template').content.querySelector('.users-list__table-row');

const createRow = (contractor) => {
  const row = rowTemplate.cloneNode(true);

  const nameCell = row.querySelector('.users-list__table-name');
  const nameSpan = nameCell.querySelector('span');
  nameSpan.textContent = contractor.userName;

  if (!contractor.isVerified) {
    nameCell.querySelector('svg').remove();
  }

  row.querySelector('.users-list__table-currency').textContent = contractor.balance.currency;
  row.querySelector('.users-list__table-exchangerate').textContent = `${formatCurrency(contractor.exchangeRate)} ₽`;
  row.querySelector('.users-list__table-cashlimit').textContent =
    `${formatCurrency(contractor.minAmount)} ₽ - ${formatCurrency(contractor.balance.amount * contractor.exchangeRate)} ₽`;

  const paymentsList = row.querySelector('.users-list__badges-list');
  paymentsList.innerHTML = '';

  if (contractor.paymentMethods) {
    contractor.paymentMethods.forEach(method => {
      const li = document.createElement('li');
      li.classList.add('users-list__badges-item', 'badge');
      li.textContent = method.provider;
      paymentsList.appendChild(li);
    });
  }

  const exchangeBtn = row.querySelector('.btn');
  exchangeBtn.dataset.id = contractor.id;
  exchangeBtn.addEventListener('click', () => {
    openModal(contractor);
  });

  return row;
};

export const renderTable = (contractors) => {
  tableBody.innerHTML = '';
  if (!contractors || contractors.length === 0) {
    // TODO: Show empty state
    return;
  }

  const fragment = document.createDocumentFragment();
  contractors.forEach(contractor => {
    fragment.appendChild(createRow(contractor));
  });
  tableBody.appendChild(fragment);
};

export const updateTable = (contractors) => {
  renderTable(contractors);
}
