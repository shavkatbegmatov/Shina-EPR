package uz.shinamagazin.api.service.export;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.dto.response.LoginAttemptResponse;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");
    private static final DateTimeFormatter FILE_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd_MM_yyyy");

    /**
     * Export audit logs to Excel format
     */
    public ByteArrayOutputStream exportAuditLogs(
            List<AuditLogResponse> logs,
            String reportTitle
    ) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            SXSSFSheet sheet = workbook.createSheet("Audit Logs");

            // Track columns for auto-sizing (required for SXSSFWorkbook)
            for (int i = 0; i < 7; i++) {
                sheet.trackColumnForAutoSizing(i);
            }

            // Create styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            int rowNum = 0;

            // Title row
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(reportTitle != null ? reportTitle : "Tizim Auditlari Hisoboti");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

            // Metadata row
            Row metaRow = sheet.createRow(rowNum++);
            Cell metaCell = metaRow.createCell(0);
            metaCell.setCellValue("Sana: " + LocalDateTime.now().format(DATE_FORMATTER));
            metaCell.setCellStyle(dataStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 6));

            // Empty row
            rowNum++;

            // Header row
            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = {"ID", "Harakat", "Obyekt turi", "Obyekt ID", "Foydalanuvchi", "Sana", "IP manzil"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            for (AuditLogResponse log : logs) {
                Row row = sheet.createRow(rowNum++);

                row.createCell(0).setCellValue(log.getId());
                row.createCell(1).setCellValue(translateAction(log.getAction()));
                row.createCell(2).setCellValue(log.getEntityType());
                row.createCell(3).setCellValue(log.getEntityId());
                row.createCell(4).setCellValue(log.getUsername() != null ? log.getUsername() : "Sistema");

                Cell dateCell = row.createCell(5);
                dateCell.setCellValue(log.getCreatedAt().format(DATE_FORMATTER));
                dateCell.setCellStyle(dateStyle);

                row.createCell(6).setCellValue(log.getIpAddress() != null ? log.getIpAddress() : "-");

                // Apply data style to all cells
                for (int i = 0; i < 7; i++) {
                    if (i != 5) { // Skip date cell (already has style)
                        row.getCell(i).setCellStyle(dataStyle);
                    }
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to output stream
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out;
        }
    }

    /**
     * Export login attempts to Excel format
     */
    public ByteArrayOutputStream exportLoginActivity(
            List<LoginAttemptResponse> attempts,
            String reportTitle
    ) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            SXSSFSheet sheet = workbook.createSheet("Login Activity");

            // Track columns for auto-sizing (required for SXSSFWorkbook)
            for (int i = 0; i < 7; i++) {
                sheet.trackColumnForAutoSizing(i);
            }

            // Create styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            int rowNum = 0;

            // Title row
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(reportTitle != null ? reportTitle : "Kirish Tarixi Hisoboti");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

            // Metadata row
            Row metaRow = sheet.createRow(rowNum++);
            Cell metaCell = metaRow.createCell(0);
            metaCell.setCellValue("Sana: " + LocalDateTime.now().format(DATE_FORMATTER));
            metaCell.setCellStyle(dataStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 6));

            // Empty row
            rowNum++;

            // Header row
            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = {"ID", "Foydalanuvchi", "Holat", "Qurilma", "Brauzer", "Sana", "IP manzil"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            for (LoginAttemptResponse attempt : attempts) {
                Row row = sheet.createRow(rowNum++);

                row.createCell(0).setCellValue(attempt.getId());
                row.createCell(1).setCellValue(attempt.getUsername());
                row.createCell(2).setCellValue("SUCCESS".equals(attempt.getStatus()) ? "Muvaffaqiyatli" : "Xato");
                row.createCell(3).setCellValue(attempt.getDeviceType() != null ? attempt.getDeviceType() : "-");
                row.createCell(4).setCellValue(attempt.getBrowser() != null ? attempt.getBrowser() : "-");

                Cell dateCell = row.createCell(5);
                dateCell.setCellValue(attempt.getCreatedAt().format(DATE_FORMATTER));
                dateCell.setCellStyle(dateStyle);

                row.createCell(6).setCellValue(attempt.getIpAddress() != null ? attempt.getIpAddress() : "-");

                // Apply data style to all cells
                for (int i = 0; i < 7; i++) {
                    if (i != 5) { // Skip date cell (already has style)
                        row.getCell(i).setCellStyle(dataStyle);
                    }
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to output stream
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out;
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setWrapText(false);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = createDataStyle(workbook);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private String translateAction(String action) {
        return switch (action) {
            case "CREATE" -> "Yaratildi";
            case "UPDATE" -> "O'zgartirildi";
            case "DELETE" -> "O'chirildi";
            default -> action;
        };
    }
}
