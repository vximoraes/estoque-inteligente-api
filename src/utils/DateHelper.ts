class DateHelper {
  static formatDate(date: Date | string | number): string {
    return new Date(date).toLocaleDateString('en-US');
  }
}

export default DateHelper;
