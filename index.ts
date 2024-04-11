export interface AddressBook {
  emp_id: string | null;
  first: string;
  last: string;
  email: string;
}

export interface Payroll {
  emp_id: string;
  vacationDays: number;
}

interface Employee {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
}

export interface EmailApi {
  createBatch(): number;
  queueEmail(
    batchId: number,
    email: string,
    subject: string,
    body: string
  ): void;
  flushBatch(batchId: number): Promise<void>;
}

function yearsSince(startDate: Date, endDate: Date): number {
  const millisecondsPerYear = 365 * 24 * 60 * 60 * 1000;
  return (endDate.getTime() - startDate.getTime()) / millisecondsPerYear;
}

class EmailAPIService implements EmailApi {
  private batchNumber: number = 0;
  private batchedEmails: Map<number, number> = new Map();

  createBatch(): number {
    this.batchNumber++;
    return this.batchNumber;
  }

  queueEmail(
    batchId: number,
    email: string,
    subject: string,
    body: string
  ): void {
    const queueEmailCount: number = this.batchedEmails.get(batchId) || 0;
    this.batchedEmails.set(batchId, queueEmailCount + 1);
  }

  flushBatch(batchId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const queueEmailCount = this.batchedEmails.get(batchId) || 0;
      const singleEmailElapsedTime: number = Math.random() / 10;

      console.log(
        `[${batchId}]: Sending ${queueEmailCount} emails, single email elapsing time: ${singleEmailElapsedTime}`
      );

      setTimeout(() => {
        console.log(
          `[${batchId}]: Sent ${queueEmailCount} emails. Elapsed time: ${
            singleEmailElapsedTime * queueEmailCount
          }`
        );
        resolve();
      }, singleEmailElapsedTime * queueEmailCount * 1000);
    });
  }
}

/**
 * We haved decided to grant bonus vacation to every employee, 1 day per year of experience
 * we need to email them a notice.
 */
async function grantVacation(
  emailApi: EmailApi,
  payroll: Payroll[],
  addresses: AddressBook[],
  employees: Employee[]
) {
  let emailBatchId = emailApi.createBatch();
  for (var index in payroll) {
    let payrollInfo = payroll[index];
    let addressInfo = addresses.find((x) => x.emp_id == payrollInfo.emp_id);
    let empInfo = employees.find((x) => x.id == payrollInfo.emp_id);

    let today = new Date();
    const yearsEmployed = yearsSince(empInfo.endDate, today);
    let newVacationBalance = yearsEmployed + payrollInfo.vacationDays;

    emailApi.queueEmail(
      emailBatchId,
      addressInfo.email,
      "Good news!",
      `Dear ${empInfo.name}\n` +
        `based on your ${yearsEmployed} years of employment, you have been granted ${yearsEmployed} days of vacation, bringing your total to ${newVacationBalance}`
    );
  }
  await emailApi.flushBatch(emailBatchId);
}

function splitIntoChunks(items: any[], chunkSize: number) {
  const chunkedItems = [];
  let chunk = [];

  for (let item of items) {
    if (chunk.length === chunkSize) {
      chunkedItems.push(chunk);
      chunk = [];
    }

    chunk.push(item);
  }

  if (chunk.length) {
    chunkedItems.push(chunk);
  }
  return chunkedItems;
}

async function grantVacationV2(
  emailApi: EmailApi,
  payroll: Payroll[],
  addresses: AddressBook[],
  employees: Employee[]
) {
  const addressMap: Map<string, AddressBook> = new Map(
    addresses.map((address: AddressBook) => [address.emp_id, address])
  );
  const employeeMap: Map<string, Employee> = new Map(
    employees.map((employee: Employee) => [employee.id, employee])
  );

  // Ideal Number of Emails in a single Batch.
  // So, we can include 10 emails in a batch send.
  const IDEAL_EMAILS_IN_SINGLE_BATCH = 10;

  // Ideal number of conccurent batch requests.
  // So, we can send 10 batch emails API requests at the same time without any issue
  const IDEAL_CONCURRENT_BATCH_REQUESTS = 10;

  async function sendBatchEmail(batchedPayroll: Payroll[]): Promise<void> {
    let emailBatchId = emailApi.createBatch();
    for (var index in batchedPayroll) {
      let payrollInfo = batchedPayroll[index];
      let addressInfo = addressMap.get(payrollInfo.emp_id);
      let empInfo = employeeMap.get(payrollInfo.emp_id);

      let today = new Date();
      const yearsEmployed = yearsSince(empInfo.endDate, today);
      let newVacationBalance = yearsEmployed + payrollInfo.vacationDays;

      emailApi.queueEmail(
        emailBatchId,
        addressInfo.email,
        "Good news!",
        `Dear ${empInfo.name}\n` +
          `based on your ${yearsEmployed} years of employment, you have been granted ${yearsEmployed} days of vacation, bringing your total to ${newVacationBalance}`
      );
    }
    await emailApi.flushBatch(emailBatchId);
  }

  for (const conccurentRequestChunks of splitIntoChunks(
    splitIntoChunks(payroll, IDEAL_EMAILS_IN_SINGLE_BATCH),
    IDEAL_CONCURRENT_BATCH_REQUESTS
  )) {
    await Promise.all(
      conccurentRequestChunks.map((batchRequest: Payroll[]) =>
        sendBatchEmail(batchRequest)
      )
    );
  }
}

const payroll: Payroll[] = [];
const addresses: AddressBook[] = [];
const employees: Employee[] = [];
const totalEmployees: number = 100;

for (let i = 0; i < totalEmployees; i++) {
  payroll.push({ emp_id: `${i}`, vacationDays: 1 });
  addresses.push({
    emp_id: `${i}`,
    first: `${i} first`,
    last: `${i} last`,
    email: `${i} email`,
  });
  employees.push({
    id: `${i}`,
    name: `${i} name`,
    startDate: new Date(),
    endDate: new Date(),
  });
}

async function comparePerformance() {
  let startTime = new Date();
  await grantVacation(new EmailAPIService(), payroll, addresses, employees);
  console.log(
    `grantVacation: Elapsed time: ${new Date().getTime() - startTime.getTime()}`
  );

  startTime = new Date();
  await grantVacationV2(new EmailAPIService(), payroll, addresses, employees);
  console.log(
    `grantVacationV2: Elapsed time: ${
      new Date().getTime() - startTime.getTime()
    }`
  );
}

comparePerformance();
