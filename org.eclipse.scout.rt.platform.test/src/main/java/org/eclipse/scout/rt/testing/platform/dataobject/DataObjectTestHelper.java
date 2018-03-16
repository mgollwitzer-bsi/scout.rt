/*******************************************************************************
 * Copyright (c) 2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.testing.platform.dataobject;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Collection;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.dataobject.DoEntity;
import org.eclipse.scout.rt.platform.dataobject.DoList;
import org.eclipse.scout.rt.platform.dataobject.DoNode;
import org.eclipse.scout.rt.platform.dataobject.DoValue;
import org.eclipse.scout.rt.platform.dataobject.IDoEntity;

/**
 * Helper for unit tests dealing with {@link DoEntity}.
 */
@ApplicationScoped
public class DataObjectTestHelper {

  /**
   * Asserts (deep) equality for specified {@link DoEntity} objects and additionally asserts, that concrete
   * {@link DoEntity} class of expected entity and class of actual {@link DoEntity} is identical.
   */
  public void assertDoEntityEquals(IDoEntity expected, IDoEntity actual) {
    assertDoEntityEquals(expected, actual, true);
  }

  /**
   * Asserts (deep) equality for specified {@link DoEntity} objects.
   *
   * @param if
   *          {@code true} concrete class of both {@link DoEntity} must be the identical
   */
  public void assertDoEntityEquals(IDoEntity expected, IDoEntity actual, boolean assertClassEquals) {
    if (assertClassEquals) {
      assertEquals(expected.getClass(), actual.getClass());
    }
    assertObjectEquals(expected.allNodes(), actual.allNodes(), assertClassEquals);

    // assert all attribute names are set correctly to be equals to the corresponding map key
    assertMapKeyEqualsAttributeName(actual);
    assertMapKeyEqualsAttributeName(expected);
  }

  /**
   * Asserts (deep) equality for specified {@link DoList} objects and additionally asserts, that all nested concrete
   * {@link DoEntity} classes within the specified lists are identical.
   */
  public void assertDoListEquals(DoList<?> expected, DoList<?> actual) {
    assertDoListEquals(expected, actual, true);
  }

  /**
   * Asserts (deep) equality for specified {@link DoList} objects.
   *
   * @param if
   *          {@code true} concrete class of all nested {@link DoEntity}'s must be the identical
   */
  public void assertDoListEquals(DoList<?> expected, DoList<?> actual, boolean assertClassEquals) {
    assertEquals(expected.getClass(), actual.getClass());
    assertObjectEquals(expected.get(), actual.get(), assertClassEquals);
  }

  protected void assertMapKeyEqualsAttributeName(IDoEntity actual) {
    for (String key : actual.allNodes().keySet()) {
      assertEquals("key of attribute map is not equals to node attribute name", key, actual.getNode(key).getAttributeName());
    }
  }

  /**
   * Asserts (deep) equality of two {@link Object}, taking into account nested {@link DoNode} elements which requires
   * custom equality check.
   * <p>
   * TODO [7.1] pbz: Add assert-param object instead of 'boolean assertClassEquals', e.g. allow BigDecimal == double for
   * raw DO's
   */
  public void assertObjectEquals(Object expected, Object actual, boolean assertClassEquals) {
    if (expected == null) {
      assertNull(actual);
    }
    else if (expected instanceof IDoEntity) {
      assertDoEntityEquals((IDoEntity) expected, (IDoEntity) actual, assertClassEquals);
    }
    else if (expected instanceof DoValue) {
      assertEquals(expected.getClass(), actual.getClass());
      assertObjectEquals(((DoValue<?>) expected).get(), ((DoValue<?>) actual).get(), assertClassEquals);
    }
    else if (expected instanceof DoList) {
      assertEquals(expected.getClass(), actual.getClass());
      assertDoListEquals(DoList.class.cast(expected), DoList.class.cast(actual), assertClassEquals);
    }
    else if (expected instanceof Collection) {
      Collection<?> expectedCollection = (Collection<?>) expected;
      Collection<?> actualCollection = (Collection<?>) actual;
      assertEquals("size of collection does not match", expectedCollection.size(), actualCollection.size());
      Iterator<?> expectedIter = expectedCollection.iterator();
      Iterator<?> actualIter = actualCollection.iterator();
      while (expectedIter.hasNext()) {
        assertObjectEquals(expectedIter.next(), actualIter.next(), assertClassEquals);
      }
    }
    else if (expected instanceof Map) {
      Map<?, ?> expectedMap = (Map<?, ?>) expected;
      Map<?, ?> actualMap = (Map<?, ?>) actual;
      assertEquals("size of map does not match", expectedMap.size(), actualMap.size());

      for (Entry<?, ?> expectedEntry : expectedMap.entrySet()) {
        assertTrue("actual map does not contain expected key " + expectedEntry.getKey(), actualMap.containsKey(expectedEntry.getKey()));
        assertObjectEquals(expectedEntry.getValue(), actualMap.get(expectedEntry.getKey()), assertClassEquals);
      }
      for (Entry<?, ?> actualEntry : actualMap.entrySet()) {
        assertTrue("expected map does not contain actual key " + actualEntry.getKey(), expectedMap.containsKey(actualEntry.getKey()));
        assertObjectEquals(expectedMap.get(actualEntry.getKey()), actualEntry.getValue(), assertClassEquals);
      }
    }
    else if (expected.getClass().isArray()) {
      assertTrue(Objects.deepEquals(expected, actual)); // delegates to Arrays.deepEquals0()
    }
    else {
      assertEquals(expected, actual);
    }
  }
}
