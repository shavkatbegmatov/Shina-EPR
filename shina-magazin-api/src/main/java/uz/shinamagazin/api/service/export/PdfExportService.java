package uz.shinamagazin.api.service.export;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.dto.response.LoginAttemptResponse;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");
    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
    private static final Font HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);
    private static final Font DATA_FONT = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);

    /**
     * Export audit logs to PDF format
     */
    public ByteArrayOutputStream exportAuditLogs(
            List<AuditLogResponse> logs,
            String reportTitle
    ) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate()); // Landscape for more columns
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // Title
        Paragraph title = new Paragraph(
                reportTitle != null ? reportTitle : "Tizim Auditlari Hisoboti",
                TITLE_FONT
        );
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(10);
        document.add(title);

        // Metadata
        Paragraph metadata = new Paragraph(
                "Sana: " + LocalDateTime.now().format(DATE_FORMATTER),
                DATA_FONT
        );
        metadata.setAlignment(Element.ALIGN_CENTER);
        metadata.setSpacingAfter(20);
        document.add(metadata);

        // Table
        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10);

        // Headers
        addTableHeader(table, new String[]{"ID", "Harakat", "Obyekt turi", "Obyekt ID", "Foydalanuvchi", "Sana", "IP manzil"});

        // Data
        for (AuditLogResponse log : logs) {
            addTableCell(table, String.valueOf(log.getId()));
            addTableCell(table, translateAction(log.getAction()));
            addTableCell(table, log.getEntityType());
            addTableCell(table, String.valueOf(log.getEntityId()));
            addTableCell(table, log.getUsername() != null ? log.getUsername() : "Sistema");
            addTableCell(table, log.getCreatedAt().format(DATE_FORMATTER));
            addTableCell(table, log.getIpAddress() != null ? log.getIpAddress() : "-");
        }

        document.add(table);

        // Footer
        Paragraph footer = new Paragraph(
                String.format("Jami: %d ta yozuv", logs.size()),
                DATA_FONT
        );
        footer.setAlignment(Element.ALIGN_RIGHT);
        footer.setSpacingBefore(20);
        document.add(footer);

        document.close();
        return out;
    }

    /**
     * Export login attempts to PDF format
     */
    public ByteArrayOutputStream exportLoginActivity(
            List<LoginAttemptResponse> attempts,
            String reportTitle
    ) throws DocumentException {
        Document document = new Document(PageSize.A4.rotate()); // Landscape for more columns
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // Title
        Paragraph title = new Paragraph(
                reportTitle != null ? reportTitle : "Kirish Tarixi Hisoboti",
                TITLE_FONT
        );
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(10);
        document.add(title);

        // Metadata
        Paragraph metadata = new Paragraph(
                "Sana: " + LocalDateTime.now().format(DATE_FORMATTER),
                DATA_FONT
        );
        metadata.setAlignment(Element.ALIGN_CENTER);
        metadata.setSpacingAfter(20);
        document.add(metadata);

        // Table
        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setSpacingBefore(10);

        // Headers
        addTableHeader(table, new String[]{"ID", "Foydalanuvchi", "Holat", "Qurilma", "Brauzer", "Sana", "IP manzil"});

        // Data
        for (LoginAttemptResponse attempt : attempts) {
            addTableCell(table, String.valueOf(attempt.getId()));
            addTableCell(table, attempt.getUsername());
            addTableCell(table, "SUCCESS".equals(attempt.getStatus()) ? "Muvaffaqiyatli" : "Xato");
            addTableCell(table, attempt.getDeviceType() != null ? attempt.getDeviceType() : "-");
            addTableCell(table, attempt.getBrowser() != null ? attempt.getBrowser() : "-");
            addTableCell(table, attempt.getCreatedAt().format(DATE_FORMATTER));
            addTableCell(table, attempt.getIpAddress() != null ? attempt.getIpAddress() : "-");
        }

        document.add(table);

        // Footer
        Paragraph footer = new Paragraph(
                String.format("Jami: %d ta yozuv", attempts.size()),
                DATA_FONT
        );
        footer.setAlignment(Element.ALIGN_RIGHT);
        footer.setSpacingBefore(20);
        document.add(footer);

        document.close();
        return out;
    }

    private void addTableHeader(PdfPTable table, String[] headers) {
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, HEADER_FONT));
            cell.setBackgroundColor(new Color(0, 51, 102)); // Dark blue
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(8);
            table.addCell(cell);
        }
    }

    private void addTableCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, DATA_FONT));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5);
        table.addCell(cell);
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
