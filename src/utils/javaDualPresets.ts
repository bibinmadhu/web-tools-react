export interface JavaDualPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  mainFile: {
    fileName: string;
    code: string;
  };
  testFile: {
    fileName: string;
    code: string;
  };
}

export const JAVA_DUAL_PRESETS: JavaDualPreset[] = [
  {
    id: 'springboot-order-service',
    name: 'Spring Boot Service & Mockito Unit Test',
    badge: 'Spring + Mockito',
    description: 'Enterprise OrderService with Spring DI, transactional validation, and a comprehensive Mockito + JUnit 5 unit test',
    mainFile: {
      fileName: 'OrderService.java',
      code: `package com.acme.ecommerce.service;

import com.acme.ecommerce.model.Order;
import com.acme.ecommerce.repository.OrderRepository;
import com.acme.ecommerce.exception.OrderValidationException;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    @Autowired
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order createOrder(String customerId, double amount, String currency) {
        if (amount <= 0) {
            throw new OrderValidationException("Amount must be greater than zero");
        }
        String orderNumber = "ORD-" + UUID.randomUUID().toString().substring(0, 8);
        Order order = new Order(orderNumber, customerId, amount, currency, "PENDING", LocalDateTime.now());
        return orderRepository.save(order);
    }

    public boolean cancelOrder(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber);
        if (order != null && "PENDING".equals(order.getStatus())) {
            order.setStatus("CANCELLED");
            orderRepository.save(order);
            return true;
        }
        return false;
    }

    public double calculateDiscountedTotal(double subtotal, double discountRate) {
        if (discountRate < 0 || discountRate > 1.0) {
            return subtotal;
        }
        return subtotal * (1.0 - discountRate);
    }
}`,
    },
    testFile: {
      fileName: 'OrderServiceTest.java',
      code: `package com.acme.ecommerce.service;

import com.acme.ecommerce.model.Order;
import com.acme.ecommerce.repository.OrderRepository;
import com.acme.ecommerce.exception.OrderValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;

    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        sampleOrder = new Order("ORD-12345678", "CUST-99", 150.00, "USD", "PENDING", null);
    }

    @Test
    @DisplayName("Should successfully create order when amount is valid")
    void testCreateOrderSuccess() {
        when(orderRepository.save(any(Order.class))).thenReturn(sampleOrder);

        Order created = orderService.createOrder("CUST-99", 150.00, "USD");

        assertNotNull(created);
        assertEquals("ORD-12345678", created.getOrderNumber());
        assertEquals(150.00, created.getAmount());
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    @DisplayName("Should throw exception when order amount is zero or negative")
    void testCreateOrderInvalidAmount() {
        assertThrows(OrderValidationException.class, () -> {
            orderService.createOrder("CUST-99", -10.00, "USD");
        });
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("Should cancel pending order and persist status update")
    void testCancelPendingOrder() {
        when(orderRepository.findByOrderNumber("ORD-12345678")).thenReturn(sampleOrder);

        boolean result = orderService.cancelOrder("ORD-12345678");

        assertTrue(result);
        assertEquals("CANCELLED", sampleOrder.getStatus());
        verify(orderRepository).save(sampleOrder);
    }

    @Test
    void testCalculateDiscountedTotal() {
        double result = orderService.calculateDiscountedTotal(200.0, 0.15);
        assertEquals(170.0, result, 0.001);
    }
}`,
    },
  },
  {
    id: 'jwt-validator-test',
    name: 'Security Token Validator & JUnit 5 Test',
    badge: 'Security / JWT',
    description: 'Cryptographic token validation utility with header parsing, expiry checking, and edge-case unit assertions',
    mainFile: {
      fileName: 'TokenSecurityValidator.java',
      code: `package com.acme.security.auth;

import java.util.Base64;
import java.nio.charset.StandardCharsets;

public class TokenSecurityValidator {

    private final String expectedIssuer;
    private final long maxTokenAgeSeconds;

    public TokenSecurityValidator(String expectedIssuer, long maxTokenAgeSeconds) {
        this.expectedIssuer = expectedIssuer;
        this.maxTokenAgeSeconds = maxTokenAgeSeconds;
    }

    public boolean validateTokenStructure(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        String[] parts = token.split("\\\\.");
        return parts.length == 3;
    }

    public String decodePayload(String token) {
        if (!validateTokenStructure(token)) {
            throw new IllegalArgumentException("Malformed JWT format");
        }
        String payloadBase64 = token.split("\\\\.")[1];
        byte[] decoded = Base64.getUrlDecoder().decode(payloadBase64);
        return new String(decoded, StandardCharsets.UTF_8);
    }

    public boolean isTokenExpired(long issuedAtEpochSeconds, long currentEpochSeconds) {
        if (currentEpochSeconds < issuedAtEpochSeconds) {
            return true; // Clock skew or invalid future date
        }
        return (currentEpochSeconds - issuedAtEpochSeconds) > maxTokenAgeSeconds;
    }

    public String getExpectedIssuer() {
        return this.expectedIssuer;
    }
}`,
    },
    testFile: {
      fileName: 'TokenSecurityValidatorTest.java',
      code: `package com.acme.security.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

public class TokenSecurityValidatorTest {

    private TokenSecurityValidator validator;
    private static final String SAMPLE_VALID_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSIsImlzcyI6ImFjbWUiLCJpYXQiOjE2MDAwMDAwMDB9.c2lnbmF0dXJlX2RhdGE";

    @BeforeEach
    void setUp() {
        validator = new TokenSecurityValidator("acme", 3600);
    }

    @Test
    @DisplayName("Valid 3-part token should pass structure check")
    void testValidateTokenStructureSuccess() {
        boolean isValid = validator.validateTokenStructure(SAMPLE_VALID_JWT);
        assertTrue(isValid);
    }

    @Test
    @DisplayName("Single part or malformed string should fail structure check")
    void testValidateTokenStructureMalformed() {
        assertFalse(validator.validateTokenStructure("invalid-token-without-periods"));
        assertFalse(validator.validateTokenStructure(null));
        assertFalse(validator.validateTokenStructure("   "));
    }

    @Test
    @DisplayName("Payload decoding should return UTF-8 JSON claims")
    void testDecodePayload() {
        String payload = validator.decodePayload(SAMPLE_VALID_JWT);
        assertNotNull(payload);
        assertTrue(payload.contains("acme"));
        assertTrue(payload.contains("12345"));
    }

    @Test
    @DisplayName("Expired timestamp beyond maxTokenAge should return true")
    void testIsTokenExpired() {
        long issuedAt = 1000L;
        long currentTimeExpired = 1000L + 3601L;
        long currentTimeActive = 1000L + 1800L;

        assertTrue(validator.isTokenExpired(issuedAt, currentTimeExpired));
        assertFalse(validator.isTokenExpired(issuedAt, currentTimeActive));
    }
}`,
    },
  },
  {
    id: 'pricing-engine-test',
    name: 'Pricing & Discount Engine & Parameterized Test',
    badge: 'Domain / Math',
    description: 'High-performance arithmetic domain model with tiered rebate rules and JUnit 5 boundary condition test cases',
    mainFile: {
      fileName: 'PricingEngine.java',
      code: `package com.acme.billing.domain;

import java.util.List;

public class PricingEngine {

    private final double baseTaxRate;

    public PricingEngine(double baseTaxRate) {
        this.baseTaxRate = baseTaxRate;
    }

    public double calculateFinalPrice(double basePrice, int itemQuantity, boolean isVipCustomer) {
        if (basePrice < 0 || itemQuantity <= 0) {
            throw new IllegalArgumentException("Invalid price or quantity");
        }

        double subtotal = basePrice * itemQuantity;
        double volumeDiscount = getVolumeDiscountPercent(itemQuantity);
        double discountedSubtotal = subtotal * (1.0 - volumeDiscount);

        if (isVipCustomer) {
            discountedSubtotal *= 0.95; // Extra 5% VIP rebate
        }

        return discountedSubtotal * (1.0 + baseTaxRate);
    }

    public double getVolumeDiscountPercent(int quantity) {
        if (quantity >= 50) return 0.20;
        if (quantity >= 20) return 0.10;
        if (quantity >= 5)  return 0.05;
        return 0.0;
    }

    public double computeTaxAmount(double amount) {
        return amount * this.baseTaxRate;
    }
}`,
    },
    testFile: {
      fileName: 'PricingEngineTest.java',
      code: `package com.acme.billing.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class PricingEngineTest {

    private PricingEngine pricingEngine;

    @BeforeEach
    void init() {
        pricingEngine = new PricingEngine(0.08); // 8% sales tax
    }

    @Test
    void testStandardCalculationWithoutDiscounts() {
        // 1 item @ $100 => $100 * 1.08 = $108.00
        double price = pricingEngine.calculateFinalPrice(100.00, 1, false);
        assertEquals(108.00, price, 0.01);
    }

    @Test
    void testTieredVolumeDiscountThresholds() {
        assertEquals(0.00, pricingEngine.getVolumeDiscountPercent(1));
        assertEquals(0.05, pricingEngine.getVolumeDiscountPercent(5));
        assertEquals(0.10, pricingEngine.getVolumeDiscountPercent(20));
        assertEquals(0.20, pricingEngine.getVolumeDiscountPercent(50));
    }

    @Test
    void testVipDiscountApplication() {
        // 10 items @ $10 => subtotal $100, 5% volume discount => $95. 5% VIP discount => $90.25. Tax 8% => $97.47
        double vipPrice = pricingEngine.calculateFinalPrice(10.00, 10, true);
        double regularPrice = pricingEngine.calculateFinalPrice(10.00, 10, false);

        assertTrue(vipPrice < regularPrice);
        assertEquals(97.47, vipPrice, 0.05);
    }

    @Test
    void testNegativePriceThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            pricingEngine.calculateFinalPrice(-50.00, 2, false);
        });
    }
}`,
    },
  },
];
