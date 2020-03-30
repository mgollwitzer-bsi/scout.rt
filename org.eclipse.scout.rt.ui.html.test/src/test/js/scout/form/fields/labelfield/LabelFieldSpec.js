/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
describe("LabelField", function() {
  var session;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new scout.FormSpecHelper(session);
  });

  describe("HtmlEnabled", function() {
    var field;

    beforeEach(function() {
      field = helper.createField('LabelField');
    });

    it("if false, encodes html in display text", function() {
      field.htmlEnabled = false;
      field.displayText = '<b>Hello</b>';
      field.render();
      expect(field.$field.html()).toBe('&lt;b&gt;Hello&lt;/b&gt;');
    });

    it("if true, does not encode html in display text", function() {
      field.htmlEnabled = true;
      field.displayText = '<b>Hello</b>';
      field.render();
      expect(field.$field.html()).toBe('<b>Hello</b>');
    });

    it("if false, replaces \n with br tag and encodes other text", function() {
      field.htmlEnabled = false;
      field.displayText = '<b>Hello</b>\nGoodbye';
      field.render();
      expect(field.$field.html()).toBe('&lt;b&gt;Hello&lt;/b&gt;<br>Goodbye');
    });

    it("if true, does not replace \n with br tag and does not encode other text", function() {
      field.htmlEnabled = true;
      field.displayText = '<b>Hello</b>\nGoodbye';
      field.render();
      expect(field.$field.html()).toBe('<b>Hello</b>\nGoodbye');
    });
  });

});