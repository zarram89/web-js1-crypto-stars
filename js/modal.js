import { postExchange } from './api.js';
import { formatCurrency } from './utils.js';

let currentModal = null;
let pristine = null;
let currentContractor = null;
let currentUser = null; // We need to pass this or store it

// We can export a function to set user
export const setModalUser = (user) => {
  currentUser = user;
};

const modals = {
  buy: document.querySelector('.modal--buy'),
  sell: document.querySelector('.modal--sell')
};

const closeButtons = document.querySelectorAll('.modal__close-btn');
const overlays = document.querySelectorAll('.modal__overlay');

const closeModal = () => {
  if (!currentModal) return;
  currentModal.style.display = 'none';
  document.body.classList.remove('scroll-lock');

  // Reset form
  const form = currentModal.querySelector('form');
  form.reset();
  if (pristine) {
    pristine.destroy();
    pristine = null;
  }

  // Hide messages
  currentModal.querySelector('.modal__validation-message--error').style.display = 'none';
  currentModal.querySelector('.modal__validation-message--success').style.display = 'none';

  currentModal = null;
  currentContractor = null;
};

const onEscPress = (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
};

const initForm = (modal, type, contractor) => {
  const form = modal.querySelector('form');

  // Hidden fields
  form.contractorId.value = contractor.id;
  form.exchangeRate.value = contractor.exchangeRate;
  form.sendingCurrency.value = type === 'buy' ? 'RUB' : 'KEKS';
  form.receivingCurrency.value = type === 'buy' ? 'KEKS' : 'RUB';

  // Info fields
  modal.querySelector('.transaction-info__item--name .transaction-info__data').innerHTML = `
    <svg width="20" height="20" aria-hidden="true">
        <use xlink:href="#icon-star"></use>
    </svg>${contractor.userName}
`;
  if (!contractor.isVerified) {
    const svg = modal.querySelector('.transaction-info__item--name svg');
    if (svg) svg.remove();
  }

  modal.querySelector('.transaction-info__item--exchangerate .transaction-info__data').textContent =
    `${formatCurrency(contractor.exchangeRate)} ₽`;

  modal.querySelector('.transaction-info__item--cashlimit .transaction-info__data').textContent =
    `${formatCurrency(contractor.minAmount)} ₽ - ${formatCurrency(contractor.balance.amount * contractor.exchangeRate)} ₽`;

  // Inputs
  // Buy: Input 1 is RUB (Payment), Input 2 is KEKS (Credit)
  // Sell: Input 1 is KEKS (Payment), Input 2 is RUB (Credit)

  const inputPayment = modal.querySelectorAll('.custom-input input')[0];
  const inputCredit = modal.querySelectorAll('.custom-input input')[1];
  const exchangeAllBtn = modal.querySelector('.custom-input__btn');

  // Payment Systems
  const selectWrapper = modal.querySelector('.select select');
  // Clear options except first
  while (selectWrapper.options.length > 1) {
    selectWrapper.remove(1);
  }

  // Populate payment methods from USER (if buying) or CONTRACTOR (if selling)?
  // Task: "2.2 Покупка валюты ... Поле Платёжная система ... Информация для заполнения поля берётся из данных продавца." (Seller is contractor)
  // Task: "2.3 Продажа ... Информация для заполнения поля Платёжная система берётся из данных пользователя"

  const paymentSource = type === 'buy' ? contractor : currentUser;

  if (paymentSource && paymentSource.paymentMethods) {
    paymentSource.paymentMethods.forEach(pm => {
      const option = document.createElement('option');
      option.value = pm.provider;
      option.textContent = pm.provider;
      selectWrapper.appendChild(option);
    });
  }

  // Card/Wallet fields
  const cardInput = modal.querySelector('input[placeholder="1234 5678 9012 3456"]');
  const walletInput = modal.querySelector('input[placeholder*="08701943851"]'); // Regex-ish selector?
  // Actually let's use the label text or order.
  // Buy Modal:
  // 3rd input wrapper: Card (User's card? No, "При выборе покупки за наличный расчёт поле Номер банковской карты остаётся пустым. Во всех остальных случаях, подставляется соответствующий номер карты.")
  // Wait, if I buy, I send money. I send from MY card? Or I send TO seller's card?
  // "При выборе покупки за наличный расчёт поле Номер банковской карты остаётся пустым. Во всех остальных случаях, подставляется соответствующий номер карты. Ручное редактирование поля запрещено."
  // Usually this means the target account. But here it says "Номер банковской карты пользователя" in the label (line 371).
  // And "Информация для поля Номер криптокошелька берётся из данных пользователя." (line 378 label says "Номер криптокошелька пользователя").

  // Let's look at "2.2 Покупка валюты":
  // "Поле Платёжная система ... Информация для заполнения поля берётся из данных продавца."
  // "При выборе покупки за наличный расчёт поле Номер банковской карты остаётся пустым. Во всех остальных случаях, подставляется соответствующий номер карты." (Whose card? Probably Seller's, based on context of Payment System).
  // BUT the label in HTML says "Номер банковской карты пользователя". This is confusing.
  // However, "Информация для поля Номер криптокошелька берётся из данных пользователя." -> This is clear.

  // Let's assume:
  // Buy:
  // Payment System: From Seller.
  // Card Number: From Seller (based on selected payment system).
  // Wallet: From User (to receive KEKS).

  // Sell:
  // Payment System: From User.
  // Wallet: From Contractor (Buyer).

  // Let's implement logic:

  selectWrapper.addEventListener('change', () => {
    const selectedProvider = selectWrapper.value;
    const method = paymentSource.paymentMethods.find(pm => pm.provider === selectedProvider);

    if (cardInput) {
      if (method && method.accountNumber) {
        cardInput.value = method.accountNumber;
      } else {
        cardInput.value = '';
      }
    }

    // Update hidden field paymentMethod? No, form submit sends select value.
  });

  // Wallet
  if (walletInput) {
    const walletSource = type === 'buy' ? currentUser : contractor;
    if (walletSource && walletSource.wallet) {
      walletInput.value = walletSource.wallet.address;
    }
  }

  // Exchange All
  exchangeAllBtn.addEventListener('click', () => {
    // Buy: Buy all KEKS seller has OR spend all my RUB?
    // "Для полей оплата и зачисление доступна функция обменять всё. То есть купить все KEKS, что есть на счету продавца, или KEKS на все деньги, что есть у пользователя."
    // Complex. Let's simplify: Fill with max possible.
    // If Buy: Max limited by Seller's KEKS * Rate AND User's RUB.
    // Seller's KEKS in RUB = contractor.balance.amount * rate.
    // User's RUB = currentUser.balances.find(b => b.currency === 'RUB').amount;
    // Min of these two.

    // If Sell: Max limited by User's KEKS AND Buyer's RUB / Rate.

    let maxAmount = 0;
    const rate = contractor.exchangeRate;

    if (type === 'buy') {
      const sellerMaxRub = contractor.balance.amount * rate;
      const userMaxRub = currentUser.balances.find(b => b.currency === 'RUB').amount;
      maxAmount = Math.min(sellerMaxRub, userMaxRub);
      inputPayment.value = maxAmount.toFixed(2); // Payment is in RUB
      inputCredit.value = (maxAmount / rate).toFixed(2); // Credit is in KEKS
    } else {
      const buyerMaxKeks = contractor.balance.amount / rate; // Buyer pays RUB, so his limit is RUB.
      const userMaxKeks = currentUser.balances.find(b => b.currency === 'KEKS').amount;
      maxAmount = Math.min(buyerMaxKeks, userMaxKeks); // Wait, buyer balance is in RUB?
      // Contractor (Buyer) balance: { currency: "RUB", amount: 120064 }
      // So buyerMaxKeks = contractor.balance.amount / rate.

      inputPayment.value = maxAmount.toFixed(2); // Payment is in KEKS
      inputCredit.value = (maxAmount * rate).toFixed(2); // Credit is in RUB
    }

    // Trigger validation
    if (pristine) pristine.validate();
  });

  // Two-way binding
  const calculate = (source) => {
    const val = parseFloat(source.value);
    if (isNaN(val)) {
      if (source === inputPayment) inputCredit.value = '';
      else inputPayment.value = '';
      return;
    }

    const rate = contractor.exchangeRate;
    if (type === 'buy') {
      // Payment RUB, Credit KEKS
      if (source === inputPayment) {
        inputCredit.value = (val / rate).toFixed(2);
      } else {
        inputPayment.value = (val * rate).toFixed(2);
      }
    } else {
      // Payment KEKS, Credit RUB
      if (source === inputPayment) {
        inputCredit.value = (val * rate).toFixed(2);
      } else {
        inputPayment.value = (val / rate).toFixed(2);
      }
    }
  };

  inputPayment.addEventListener('input', () => calculate(inputPayment));
  inputCredit.addEventListener('input', () => calculate(inputCredit));

  // Validation
  pristine = new Pristine(form, {
    classTo: 'custom-input',
    errorClass: 'is-invalid',
    successClass: 'is-valid',
    errorTextParent: 'custom-input',
    errorTextTag: 'div',
    errorTextClass: 'custom-input__error'
  });

  // Validators
  // Min/Max for Payment field
  // "Для поля оплата есть ограничения по максимальным и минимальным лимитам в рублях."
  // Note: Payment field in Sell modal is KEKS. But limit is in RUB?
  // "Значение минимального размера сделки для контрагентов приходит с сервера в рублях."
  // So if Sell (Payment in KEKS), we need to convert to RUB to check minAmount?
  // Or check if inputPayment * rate >= minAmount.

  const validateAmount = (value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return false;

    const rubValue = type === 'buy' ? val : val * contractor.exchangeRate;

    // Min
    if (rubValue < contractor.minAmount) return false;

    // Max
    // For Buy: Max is Seller's KEKS (in RUB) AND User's RUB.
    // For Sell: Max is User's KEKS (in RUB) AND Buyer's RUB.

    // Actually, let's just check against the displayed limit in the modal info?
    // "Лимит 9 999 999 ₽ - 9 999 999 000 ₽"
    // The upper limit is min(Contractor Balance in RUB, User Balance in RUB)?
    // Task says: "Максимальное значение лимита сделки для продавца зависит от количества KEKS, которая у него есть на счету, и курса продавца. Для покупателя максимальный лимит сделки — сумма рублей на его счету."

    // Let's calculate max limit in RUB
    let maxLimitRub = 0;
    if (type === 'buy') {
      // Seller (Contractor) has KEKS.
      const sellerLimit = contractor.balance.amount * contractor.exchangeRate;
      // User has RUB.
      const userLimit = currentUser.balances.find(b => b.currency === 'RUB').amount;
      maxLimitRub = Math.min(sellerLimit, userLimit);
    } else {
      // Buyer (Contractor) has RUB.
      const buyerLimit = contractor.balance.amount;
      // User has KEKS.
      const userLimit = currentUser.balances.find(b => b.currency === 'KEKS').amount * contractor.exchangeRate;
      maxLimitRub = Math.min(buyerLimit, userLimit);
    }

    return rubValue <= maxLimitRub;
  };

  pristine.addValidator(inputPayment, validateAmount, 'Сумма вне лимита', 2, false);

  // Password
  // "Поле Платёжный пароль не должно быть пустым. В противном случае поле не должно проходить валидацию. С сервера также будет приходить ошибка, если пароль неверный. Верный пароль — 180712."
  // We can add a custom validator or just required.
  // Let's add required.
  const passwordInput = modal.querySelector('input[type="password"]');
  pristine.addValidator(passwordInput, (val) => val && val.length > 0, 'Введите пароль', 2, false);

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = pristine.validate();
    if (!valid) {
      modal.querySelector('.modal__validation-message--error').style.display = 'block';
      return;
    }

    modal.querySelector('.modal__validation-message--error').style.display = 'none';

    const formData = new FormData(form);
    // Add missing fields if needed?
    // sendingAmount, receivingAmount
    formData.append('sendingAmount', inputPayment.value);
    formData.append('receivingAmount', inputCredit.value);
    formData.append('paymentMethod', selectWrapper.value);
    formData.append('paymentPassword', passwordInput.value);

    try {
      await postExchange(formData);
      modal.querySelector('.modal__validation-message--success').style.display = 'block';
      setTimeout(() => {
        closeModal();
        // Refresh data?
        // window.location.reload(); // Or fetch data again
      }, 2000);
    } catch (error) {
      modal.querySelector('.modal__validation-message--error').textContent = 'Ошибка сервера';
      modal.querySelector('.modal__validation-message--error').style.display = 'block';
    }
  });
};

export const initModal = () => {
  closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
  overlays.forEach(overlay => overlay.addEventListener('click', closeModal));
  document.addEventListener('keydown', onEscPress);
};

export const openModal = (contractor) => {
  // Determine type based on contractor status
  // If contractor is SELLER, we BUY.
  // If contractor is BUYER, we SELL.
  const type = contractor.status === 'seller' ? 'buy' : 'sell';

  currentModal = modals[type];
  currentContractor = contractor;

  if (!currentModal) return;

  currentModal.style.display = 'block';
  document.body.classList.add('scroll-lock');

  initForm(currentModal, type, contractor);
};
